import { CompanyBase } from './company.model';

export type PriceTrend = 'up' | 'down' | 'same' | null;

export interface StockRow extends CompanyBase {
  unitNet: number;
  unitGross: number;
  totalNet: number;
  totalGross: number;
  trend?: PriceTrend;
}
