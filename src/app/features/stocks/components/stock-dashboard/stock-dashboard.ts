import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ChartModule } from 'primeng/chart';
import { DialogService } from 'primeng/dynamicdialog';
import { ToastModule } from 'primeng/toast';

import { AddStockDialogComponent } from '../add-stock-dialog/add-stock-dialog';
import { StockStoreService } from '../../services/stock-store.service';
import { StockRow } from '@core/models/stock-view.model';

@Component({
  selector: 'app-stocks-dashboard',
  standalone: true,
  imports: [CommonModule, TableModule, ButtonModule, CardModule, ChartModule, ToastModule],
  templateUrl: './stock-dashboard.html',
  styleUrl: './stock-dashboard.scss',
  providers: [DialogService],
})
export class StockDashboardComponent implements OnInit {
  readonly store = inject(StockStoreService);
  private readonly dialogService = inject(DialogService);

  ngOnInit(): void {
    this.store.init();
  }

  openDialog(): void {
    const dialogRef = this.dialogService.open(AddStockDialogComponent, {
      header: 'Dodaj akcje firmy',
      modal: true,
      width: '36rem',
      closable: !this.store.saving(),
      dismissableMask: !this.store.saving(),
      breakpoints: {
        '768px': '90vw',
      },
      draggable: false,
    });

    if (!dialogRef) {
      return;
    }

    dialogRef.onClose.subscribe((data?: { name: string; shares: number }) => {
      if (!data) return;
      this.store.save(data);
    });
  }

  trackById(index: number, row: StockRow): number {
    return row.id;
  }

  isRowUpdated(rowId: number): boolean {
    return this.store.updatedRowIds().has(rowId);
  }
}
