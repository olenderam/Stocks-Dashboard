import { provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';

import { StockStoreService } from './stock-store.service';
import { StockApiService } from './stock-api.service';
import { StockWsService } from './stock-ws.service';
import { StockMapperService } from './stock-mapper.service';

import { CompanyApi, SaveCompanyBody } from '@core/models/stock-api.model';
import { StockRow } from '@core/models/stock-view.model';
import { WsMessage, WsPriceUpdateMessage } from '@core/models/stock-ws.model';
import { STOCK_CHART_OTHER_LABEL, STOCK_CHART_TOP_N } from '../constants/stock-chart.constants';

describe('StockStoreService', () => {
  let service: StockStoreService;

  let apiSpy: jasmine.SpyObj<StockApiService>;
  let mapperSpy: jasmine.SpyObj<StockMapperService>;
  let wsConnect$: Subject<WsPriceUpdateMessage>;
  let wsMock: {
    connect: jasmine.Spy;
    connectionStatus: ReturnType<typeof signal>;
  };

  const companyA: CompanyApi = {
    id: 1,
    name: 'ACME',
    shares: 10,
    price_net: 100,
    price_gross: 123,
  };

  const companyB: CompanyApi = {
    id: 2,
    name: 'Globex',
    shares: 20,
    price_net: 50,
    price_gross: 61.5,
  };

  const rowA: StockRow = {
    id: 1,
    name: 'ACME',
    shares: 10,
    unitNet: 100,
    unitGross: 123,
    totalNet: 1000,
    totalGross: 1230,
    trend: null,
  };

  const rowB: StockRow = {
    id: 2,
    name: 'Globex',
    shares: 20,
    unitNet: 50,
    unitGross: 61.5,
    totalNet: 1000,
    totalGross: 1230,
    trend: null,
  };

  beforeEach(() => {
    apiSpy = jasmine.createSpyObj<StockApiService>('StockApiService', ['getData', 'saveData']);
    mapperSpy = jasmine.createSpyObj<StockMapperService>('StockMapperService', [
      'toStockRows',
      'upsertRow',
      'mergePriceUpdates',
    ]);

    wsConnect$ = new Subject<WsPriceUpdateMessage>();
    wsMock = {
      connect: jasmine.createSpy('connect').and.returnValue(wsConnect$.asObservable()),
      connectionStatus: signal<'connecting' | 'connected' | 'reconnecting' | 'disconnected'>(
        'disconnected',
      ),
    };

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        StockStoreService,
        { provide: StockApiService, useValue: apiSpy },
        { provide: StockMapperService, useValue: mapperSpy },
        { provide: StockWsService, useValue: wsMock },
      ],
    });

    service = TestBed.inject(StockStoreService);
  });

  it('should expose websocket connection status from ws service', () => {
    expect(service.wsConnectionStatus()).toBe('disconnected');

    wsMock.connectionStatus.set('connected');

    expect(service.wsConnectionStatus()).toBe('connected');
  });

  it('should init only once and load data once', () => {
    apiSpy.getData.and.returnValue(of({ success: true, data: [companyA, companyB] }));
    mapperSpy.toStockRows.and.returnValue([rowA, rowB]);

    service.init();
    service.init();

    expect(apiSpy.getData).toHaveBeenCalledTimes(1);
    expect(wsMock.connect).toHaveBeenCalledTimes(1);
    expect(service.initialized()).toBeTrue();
  });

  it('should load, map and sort rows by shares descending', () => {
    apiSpy.getData.and.returnValue(of({ success: true, data: [companyA, companyB] }));
    mapperSpy.toStockRows.and.returnValue([rowA, rowB]);

    service.load();

    expect(apiSpy.getData).toHaveBeenCalled();
    expect(mapperSpy.toStockRows).toHaveBeenCalledWith([companyA, companyB]);
    expect(service.rows()).toEqual([rowB, rowA]);
    expect(service.loading()).toBeFalse();
  });

  it('should sanitize payload, save and update sorted rows', () => {
    const payload: SaveCompanyBody = {
      name: '   New Company   ',
      shares: 30,
    };

    const savedCompany: CompanyApi = {
      id: 3,
      name: 'New Company',
      shares: 30,
      price_net: 10,
      price_gross: 12.3,
    };

    const rowC: StockRow = {
      id: 3,
      name: 'New Company',
      shares: 30,
      unitNet: 10,
      unitGross: 12.3,
      totalNet: 300,
      totalGross: 369,
      trend: null,
    };

    apiSpy.saveData.and.returnValue(of({ success: true, data: savedCompany }));
    mapperSpy.upsertRow.and.returnValue([rowA, rowC]);

    // preload current rows
    (service as any)._rows.set([rowA]);

    service.save(payload);

    expect(apiSpy.saveData).toHaveBeenCalledWith({
      name: 'New Company',
      shares: 30,
    });
    expect(mapperSpy.upsertRow).toHaveBeenCalledWith([rowA], savedCompany);
    expect(service.rows()).toEqual([rowC, rowA]);
    expect(service.saving()).toBeFalse();
    expect(service.updatedRowIds().has(3)).toBeTrue();
  });

  it('should update rows from websocket message and set highlight ids', () => {
    const message: WsPriceUpdateMessage = {
      type: WsMessage.PriceUpdate,
      data: [
        {
          id: 1,
          name: 'ACME',
          shares: 15,
          price_net: 120,
        },
      ],
    };

    const updatedRowA: StockRow = {
      ...rowA,
      shares: 15,
      unitNet: 120,
      unitGross: 147.6,
      totalNet: 1800,
      totalGross: 2214,
      trend: 'up',
    };

    apiSpy.getData.and.returnValue(of({ success: true, data: [companyA, companyB] }));
    mapperSpy.toStockRows.and.returnValue([rowA, rowB]);

    mapperSpy.mergePriceUpdates.and.returnValue({
      rows: [updatedRowA, rowB],
      updatedIds: new Set([1]),
    });

    service.init();
    wsConnect$.next(message);

    expect(mapperSpy.mergePriceUpdates).toHaveBeenCalledWith([rowB, rowA], message);
    expect(service.rows()).toEqual([rowB, updatedRowA]);
    expect(service.updatedRowIds().has(1)).toBeTrue();
  });

  it('should aggregate extra chart rows into "Inne"', () => {
    const rows: StockRow[] = Array.from({ length: STOCK_CHART_TOP_N + 2 }, (_, index) => ({
      id: index + 1,
      name: `Company ${index + 1}`,
      shares: index + 1,
      unitNet: 10,
      unitGross: 12.3,
      totalNet: (index + 1) * 10,
      totalGross: (index + 1) * 12.3,
      trend: null,
    }));

    (service as any)._rows.set(rows);

    const chartData = service.chartData();

    expect(chartData.labels.length).toBe(STOCK_CHART_TOP_N + 1);
    expect(chartData.labels.at(-1)).toBe(STOCK_CHART_OTHER_LABEL);
    expect(chartData.datasets[0].data.at(-1)).toBe(
      rows.slice(STOCK_CHART_TOP_N).reduce((sum, row) => sum + row.shares, 0),
    );
  });

  it('should reset trend and updated ids after highlight timeout', () => {
    jasmine.clock().install();

    try {
      const rows: StockRow[] = [
        {
          ...rowA,
          trend: 'up',
        },
      ];

      (service as any)._rows.set(rows);
      (service as any).triggerRowHighlight(new Set([1]));

      expect(service.updatedRowIds().has(1)).toBeTrue();

      jasmine.clock().tick(1201);

      expect(service.updatedRowIds().size).toBe(0);
      expect(service.rows()[0].trend).toBeNull();
    } finally {
      jasmine.clock().uninstall();
    }
  });
});
