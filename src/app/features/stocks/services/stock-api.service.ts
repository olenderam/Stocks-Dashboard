import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '@core/constants/api-endpoints';
import { ApiListResponse, SaveCompanyBody, ApiSaveResponse } from '@core/models/stock-api.model';
import { API_BASE_URL } from '@core/tokens/api-base-url.token';

@Injectable({ providedIn: 'root' })
export class StockApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  getData(): Observable<ApiListResponse> {
    return this.http.get<ApiListResponse>(`${this.baseUrl}${API_ENDPOINTS.GET_DATA}`);
  }

  saveData(payload: SaveCompanyBody): Observable<ApiSaveResponse> {
    return this.http.post<ApiSaveResponse>(`${this.baseUrl}${API_ENDPOINTS.SAVE_DATA}`, payload);
  }
}
