import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { DynamicDialogRef } from 'primeng/dynamicdialog';

@Component({
  selector: 'app-add-stock-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ButtonModule, InputTextModule, InputNumberModule],
  templateUrl: './add-stock-dialog.html',
  styleUrl: './add-stock-dialog.scss',
})
export class AddStockDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly ref = inject(DynamicDialogRef);

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(255)]],
    shares: [0, [Validators.required, Validators.min(1), Validators.max(1000000)]],
  });

  get nameControl() {
    return this.form.controls.name;
  }

  get sharesControl() {
    return this.form.controls.shares;
  }

  close(): void {
    this.ref.close();
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { name, shares } = this.form.getRawValue();

    this.ref.close({
      name: name.trim(),
      shares,
    });
  }
}
