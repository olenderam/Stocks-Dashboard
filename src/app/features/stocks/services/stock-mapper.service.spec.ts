import { StockMapperService } from './stock-mapper.service';
import { CompanyApi } from '@core/models/stock-api.model';
import { StockRow } from '@core/models/stock-view.model';
import { WsMessage, WsPriceUpdateMessage } from '@core/models/stock-ws.model';

describe('StockMapperService', () => {
  let service: StockMapperService;

  beforeEach(() => {
    service = new StockMapperService();
  });

  describe('toStockRow', () => {
    it('should map API company to StockRow and calculate totals', () => {
      const company: CompanyApi = {
        id: 1,
        name: 'ACME Corp',
        shares: 10,
        price_net: 100,
        price_gross: 123,
      };

      const result = service.toStockRow(company);

      expect(result).toEqual({
        id: 1,
        name: 'ACME Corp',
        shares: 10,
        unitNet: 100,
        unitGross: 123,
        totalNet: 1000,
        totalGross: 1230,
        trend: null,
      });
    });

    it('should calculate gross price when price_gross is not provided', () => {
      const company: CompanyApi = {
        id: 2,
        name: 'Globex',
        shares: 2,
        price_net: 10,
      };

      const result = service.toStockRow(company);

      expect(result.unitNet).toBe(10);
      expect(result.unitGross).toBe(12.3);
      expect(result.totalNet).toBe(20);
      expect(result.totalGross).toBe(24.6);
      expect(result.trend).toBeNull();
    });
  });

  describe('toStockRows', () => {
    it('should map all companies to StockRow array', () => {
      const companies: CompanyApi[] = [
        {
          id: 1,
          name: 'A',
          shares: 1,
          price_net: 10,
        },
        {
          id: 2,
          name: 'B',
          shares: 2,
          price_net: 20,
        },
      ];

      const result = service.toStockRows(companies);

      expect(result.length).toBe(2);
      expect(result[0].name).toBe('A');
      expect(result[1].name).toBe('B');
      expect(result[0].trend).toBeNull();
      expect(result[1].trend).toBeNull();
    });
  });

  describe('mergePriceUpdates', () => {
    it('should update matching rows and return updatedIds', () => {
      const current: StockRow[] = [
        {
          id: 1,
          name: 'ACME',
          shares: 10,
          unitNet: 100,
          unitGross: 123,
          totalNet: 1000,
          totalGross: 1230,
          trend: null,
        },
        {
          id: 2,
          name: 'Globex',
          shares: 5,
          unitNet: 50,
          unitGross: 61.5,
          totalNet: 250,
          totalGross: 307.5,
          trend: null,
        },
      ];

      const message: WsPriceUpdateMessage = {
        type: WsMessage.PriceUpdate,
        data: [
          {
            id: 1,
            name: 'ACME Updated',
            shares: 12,
            price_net: 110,
          },
        ],
      };

      const result = service.mergePriceUpdates(current, message);

      expect(result.updatedIds.has(1)).toBeTrue();
      expect(result.updatedIds.has(2)).toBeFalse();

      expect(result.rows[0]).toEqual({
        id: 1,
        name: 'ACME Updated',
        shares: 12,
        unitNet: 110,
        unitGross: 135.3,
        totalNet: 1320,
        totalGross: 1623.6,
        trend: 'up',
      });

      expect(result.rows[1]).toEqual(current[1]);
    });

    it('should set trend to down when new price is lower', () => {
      const current: StockRow[] = [
        {
          id: 1,
          name: 'ACME',
          shares: 10,
          unitNet: 100,
          unitGross: 123,
          totalNet: 1000,
          totalGross: 1230,
          trend: null,
        },
      ];

      const message: WsPriceUpdateMessage = {
        type: WsMessage.PriceUpdate,
        data: [
          {
            id: 1,
            name: 'ACME',
            shares: 10,
            price_net: 90,
          },
        ],
      };

      const result = service.mergePriceUpdates(current, message);

      expect(result.rows[0].trend).toBe('down');
      expect(result.rows[0].unitNet).toBe(90);
      expect(result.rows[0].unitGross).toBe(110.7);
    });

    it('should set trend to same when new price is unchanged', () => {
      const current: StockRow[] = [
        {
          id: 1,
          name: 'ACME',
          shares: 10,
          unitNet: 100,
          unitGross: 123,
          totalNet: 1000,
          totalGross: 1230,
          trend: null,
        },
      ];

      const message: WsPriceUpdateMessage = {
        type: WsMessage.PriceUpdate,
        data: [
          {
            id: 1,
            name: 'ACME',
            shares: 15,
            price_net: 100,
          },
        ],
      };

      const result = service.mergePriceUpdates(current, message);

      expect(result.rows[0].trend).toBe('same');
      expect(result.rows[0].shares).toBe(15);
      expect(result.rows[0].totalNet).toBe(1500);
      expect(result.rows[0].totalGross).toBe(1845);
    });

    it('should leave rows unchanged when update does not match any row', () => {
      const current: StockRow[] = [
        {
          id: 1,
          name: 'ACME',
          shares: 10,
          unitNet: 100,
          unitGross: 123,
          totalNet: 1000,
          totalGross: 1230,
          trend: null,
        },
      ];

      const message: WsPriceUpdateMessage = {
        type: WsMessage.PriceUpdate,
        data: [
          {
            id: 999,
            name: 'Unknown',
            shares: 1,
            price_net: 10,
          },
        ],
      };

      const result = service.mergePriceUpdates(current, message);

      expect(result.rows).toEqual(current);
      expect(result.updatedIds.size).toBe(0);
    });
  });

  describe('upsertRow', () => {
    it('should append new row when company does not exist', () => {
      const current: StockRow[] = [
        {
          id: 1,
          name: 'ACME',
          shares: 10,
          unitNet: 100,
          unitGross: 123,
          totalNet: 1000,
          totalGross: 1230,
          trend: null,
        },
      ];

      const company: CompanyApi = {
        id: 2,
        name: 'Globex',
        shares: 5,
        price_net: 20,
        price_gross: 24.6,
      };

      const result = service.upsertRow(current, company);

      expect(result.length).toBe(2);
      expect(result[1]).toEqual({
        id: 2,
        name: 'Globex',
        shares: 5,
        unitNet: 20,
        unitGross: 24.6,
        totalNet: 100,
        totalGross: 123,
        trend: null,
      });
    });

    it('should replace existing row when company already exists', () => {
      const current: StockRow[] = [
        {
          id: 1,
          name: 'ACME',
          shares: 10,
          unitNet: 100,
          unitGross: 123,
          totalNet: 1000,
          totalGross: 1230,
          trend: null,
        },
      ];

      const company: CompanyApi = {
        id: 1,
        name: 'ACME Updated',
        shares: 20,
        price_net: 50,
        price_gross: 61.5,
      };

      const result = service.upsertRow(current, company);

      expect(result.length).toBe(1);
      expect(result[0]).toEqual({
        id: 1,
        name: 'ACME Updated',
        shares: 20,
        unitNet: 50,
        unitGross: 61.5,
        totalNet: 1000,
        totalGross: 1230,
        trend: null,
      });
    });
  });
});
