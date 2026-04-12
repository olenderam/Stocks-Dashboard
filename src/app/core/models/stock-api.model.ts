import { CompanyBase } from './company.model';
import { ApiResponse } from './api-response.model';

export interface CompanyApi extends CompanyBase {
  price_net: number;
  price_gross?: number;
}

export type ApiListResponse = ApiResponse<CompanyApi[]>;
export type ApiSaveResponse = ApiResponse<CompanyApi>;

export interface SaveCompanyBody {
  name: string;
  shares: number;
}
