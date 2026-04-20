import { Injectable } from '@angular/core';
import { calculateGrossFromNet, roundPrice } from '../utils/stock-util';
import { CompanyApi } from '@core/models/stock-api.model';
import { StockRow, PriceTrend } from '@core/models/stock-view.model';
import { WsPriceUpdateMessage } from '@core/models/stock-ws.model';

@Injectable({ providedIn: 'root' })
export class StockMapperService {
  toStockRows(companies: CompanyApi[]): StockRow[] {
    return companies.map((company) => this.toStockRow(company));
  }

  toStockRow(company: CompanyApi): StockRow {
    const unitNet = roundPrice(company.price_net);
    const unitGross = roundPrice(company.price_gross ?? calculateGrossFromNet(company.price_net));

    return {
      id: company.id,
      name: company.name,
      shares: company.shares,
      unitNet,
      unitGross,
      ...this.calculateTotals(company.shares, unitNet, unitGross),
      trend: null,
    };
  }

  mergePriceUpdates(
    current: StockRow[],
    message: WsPriceUpdateMessage,
  ): { rows: StockRow[]; updatedIds: Set<number> } {
    const updatesById = new Map(message.data.map((item) => [item.id, item]));
    const updatedIds = new Set<number>();

    const rowsById = new Map<number, StockRow>(current.map((row) => [row.id, row]));

    for (const update of message.data) {
      const existingRow = rowsById.get(update.id);
      const unitNet = roundPrice(update.price_net);
      const unitGross = roundPrice(calculateGrossFromNet(unitNet));
      const shares = update.shares;

      if (existingRow) {
        rowsById.set(update.id, {
          ...existingRow,
          name: update.name,
          shares,
          unitNet,
          unitGross,
          ...this.calculateTotals(shares, unitNet, unitGross),
          trend: this.getTrend(existingRow.unitNet, unitNet),
        });
      } else {
        rowsById.set(update.id, {
          id: update.id,
          name: update.name,
          shares,
          unitNet,
          unitGross,
          ...this.calculateTotals(shares, unitNet, unitGross),
          trend: null,
        });
      }

      updatedIds.add(update.id);
      updatesById.delete(update.id);
    }

    return { rows: Array.from(rowsById.values()), updatedIds };
  }

  upsertRow(current: StockRow[], company: CompanyApi): StockRow[] {
    const mapped = this.toStockRow(company);
    const index = current.findIndex((row) => row.id === mapped.id);

    if (index === -1) {
      return [...current, mapped];
    }

    const clone = [...current];
    clone[index] = mapped;
    return clone;
  }

  private calculateTotals(shares: number, unitNet: number, unitGross: number) {
    return {
      totalNet: roundPrice(shares * unitNet),
      totalGross: roundPrice(shares * unitGross),
    };
  }

  private getTrend(previousUnitNet: number, nextUnitNet: number): PriceTrend {
    if (nextUnitNet > previousUnitNet) return 'up';
    if (nextUnitNet < previousUnitNet) return 'down';
    return 'same';
  }
}
