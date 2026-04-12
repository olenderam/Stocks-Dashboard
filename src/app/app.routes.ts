import { Routes } from '@angular/router';
import { StockDashboardComponent } from '@features/stocks/components/stock-dashboard/stock-dashboard';

export const routes: Routes = [
  {
    path: '',
    component: StockDashboardComponent,
  },
  {
    path: '**',
    redirectTo: '',
  },
];
