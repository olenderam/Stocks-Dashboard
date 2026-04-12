import { DestroyRef, Injectable, Injector, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs/operators';

import { StockApiService } from './stock-api.service';
import { StockWsService } from './stock-ws.service';
import { StockMapperService } from './stock-mapper.service';

import {
  STOCK_CHART_BORDER_COLOR,
  STOCK_CHART_COLORS,
  STOCK_CHART_LEGEND_COLOR,
  STOCK_CHART_OTHER_COLOR,
  STOCK_CHART_OTHER_LABEL,
  STOCK_CHART_TOP_N,
  STOCK_CHART_TOOLTIP_BG,
  STOCK_CHART_TOOLTIP_BORDER,
  STOCK_CHART_TOOLTIP_TEXT,
  STOCK_CHART_TOOLTIP_TITLE,
} from '../constants/stock-chart.constants';
import { sanitizeCompanyName } from '../utils/stock-util';
import { SaveCompanyBody } from '@core/models/stock-api.model';
import { StockRow } from '@core/models/stock-view.model';

@Injectable({ providedIn: 'root' })
export class StockStoreService {
  private readonly api = inject(StockApiService);
  private readonly ws = inject(StockWsService);
  private readonly mapper = inject(StockMapperService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);

  private readonly _rows = signal<StockRow[]>([]);
  private readonly _loading = signal(false);
  private readonly _saving = signal(false);
  private readonly _initialized = signal(false);
  private readonly _updatedRowIds = signal<Set<number>>(new Set());
  private readonly _wsInitialized = signal(false);

  readonly rows = this._rows.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly saving = this._saving.asReadonly();
  readonly initialized = this._initialized.asReadonly();
  readonly updatedRowIds = this._updatedRowIds.asReadonly();
  readonly wsConnectionStatus = this.ws.connectionStatus;

  private highlightTimeout: number | null = null;
  private previousWsStatus: string | null = null;
  private retryEffectInitialized = false;

  readonly chartData = computed(() => {
    const rows = this._rows();

    const top = rows.slice(0, STOCK_CHART_TOP_N);
    const rest = rows.slice(STOCK_CHART_TOP_N);
    const restSum = rest.reduce((sum, row) => sum + row.shares, 0);

    const slices = rest.length
      ? [
          ...top.map((r) => ({ name: r.name, shares: r.shares })),
          { name: STOCK_CHART_OTHER_LABEL, shares: restSum },
        ]
      : top.map((r) => ({ name: r.name, shares: r.shares }));

    return {
      labels: slices.map((row) => row.name),
      datasets: [
        {
          data: slices.map((row) => row.shares),
          backgroundColor: [
            ...STOCK_CHART_COLORS.slice(0, top.length),
            ...(rest.length ? [STOCK_CHART_OTHER_COLOR] : []),
          ],
          borderColor: STOCK_CHART_BORDER_COLOR,
          borderWidth: 2,
        },
      ],
    };
  });

  readonly chartOptions = computed(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    cutout: '58%',
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: STOCK_CHART_LEGEND_COLOR,
          usePointStyle: true,
          padding: 16,
        },
      },
      tooltip: {
        backgroundColor: STOCK_CHART_TOOLTIP_BG,
        titleColor: STOCK_CHART_TOOLTIP_TITLE,
        bodyColor: STOCK_CHART_TOOLTIP_TEXT,
        borderColor: STOCK_CHART_TOOLTIP_BORDER,
        borderWidth: 1,
      },
    },
  }));

  init(): void {
    if (!this._initialized()) {
      this.load();
      this.listenToWs();

      if (!this.retryEffectInitialized) {
        this.setupLoadRetryOnReconnect();
        this.retryEffectInitialized = true;
      }

      this._initialized.set(true);
    }
  }

  load(): void {
    this._loading.set(true);

    this.api
      .getData()
      .pipe(
        finalize(() => this._loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => {
          const rows = this.mapper.toStockRows(response?.data ?? []);
          this._rows.set(this.sortRows(rows));
        },
        error: () => {
          // handled globally by http interceptor (toast message)
        },
      });
  }

  save(payload: SaveCompanyBody): void {
    const normalizedPayload: SaveCompanyBody = {
      name: sanitizeCompanyName(payload.name),
      shares: payload.shares,
    };

    this._saving.set(true);

    this.api
      .saveData(normalizedPayload)
      .pipe(
        finalize(() => this._saving.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => {
          this._rows.update((rows) => {
            const updated = this.mapper.upsertRow(rows, response.data);

            this.triggerRowHighlight(new Set([response.data.id]));

            return this.sortRows(updated);
          });
        },
        error: () => {
          // handled globally by http interceptor (toast message)
        },
      });
  }

  private listenToWs(): void {
    this.ws
      .connect()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (message) => {
          const { rows, updatedIds } = this.mapper.mergePriceUpdates(this._rows(), message);

          this._rows.set(this.sortRows(rows));
          this.triggerRowHighlight(updatedIds);
        },
        error: () => {
          // web socket errors are handled in StockWsService (status + reconnect)
        },
      });
  }

  private sortRows(rows: StockRow[]): StockRow[] {
    return [...rows].sort((a, b) => b.shares - a.shares);
  }

  private triggerRowHighlight(updatedIds: Set<number>): void {
    if (updatedIds.size === 0) return;

    this._updatedRowIds.set(updatedIds);

    if (this.highlightTimeout) {
      clearTimeout(this.highlightTimeout);
    }

    this.highlightTimeout = setTimeout(() => {
      this._updatedRowIds.set(new Set());

      this._rows.update((rows) =>
        rows.map((row) => (updatedIds.has(row.id) ? { ...row, trend: null } : row)),
      );
    }, 1200);
  }

  private setupLoadRetryOnReconnect(): void {
    effect(
      () => {
        const currentStatus = this.wsConnectionStatus();
        const becameConnected =
          currentStatus === 'connected' && this.previousWsStatus !== 'connected';

        this.previousWsStatus = currentStatus;

        if (becameConnected && this._rows().length === 0 && !this._loading()) {
          this.load();
        }
      },
      {
        injector: this.injector,
        allowSignalWrites: true,
      },
    );
  }
}
