import { Component, Inject, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { Lead } from '../../services/lead.service';
import { I18nService } from '../../services/i18n.service';

export interface LeadDialogData {
  lead?: Lead;
}

@Component({
  selector: 'app-lead-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ data.lead ? i18n.t('leads.editLead') : i18n.t('leads.dialogNewLead') }}</h2>
    <mat-dialog-content>
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>{{ i18n.t('leads.nameLabel') }}</mat-label>
        <input matInput [(ngModel)]="form.name" required>
      </mat-form-field>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>{{ i18n.t('leads.emailLabel') }}</mat-label>
        <input matInput [(ngModel)]="form.email" type="email">
      </mat-form-field>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>{{ i18n.t('leads.phoneLabel') }}</mat-label>
        <input matInput [(ngModel)]="form.phone">
      </mat-form-field>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>{{ i18n.t('leads.sourceLabel') }}</mat-label>
        <mat-select [(ngModel)]="form.source">
          <mat-option value="manual">Manual</mat-option>
          <mat-option value="meta_ads">Meta Ads</mat-option>
          <mat-option value="whatsapp">WhatsApp</mat-option>
          <mat-option value="landing_page">Landing Page</mat-option>
          <mat-option value="csv_import">CSV</mat-option>
        </mat-select>
      </mat-form-field>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>{{ i18n.t('leads.tagsLabel') }}</mat-label>
        <input matInput [(ngModel)]="form.tags">
      </mat-form-field>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>{{ i18n.t('leads.funnelStatusLabel') }}</mat-label>
        <mat-select [(ngModel)]="form.funnel_status">
          <mat-option value="novo">{{ i18n.t('leads.novo') }}</mat-option>
          <mat-option value="contatado">{{ i18n.t('leads.contatado') }}</mat-option>
          <mat-option value="interessado">{{ i18n.t('leads.interessado') }}</mat-option>
          <mat-option value="convertido">{{ i18n.t('leads.convertido') }}</mat-option>
          <mat-option value="perdido">{{ i18n.t('leads.perdido') }}</mat-option>
        </mat-select>
      </mat-form-field>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>{{ i18n.t('leads.productInterest') }}</mat-label>
        <input matInput [(ngModel)]="form.product_interest">
      </mat-form-field>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>{{ i18n.t('leads.valueLabel') }}</mat-label>
        <input matInput [(ngModel)]="form.value" type="number">
      </mat-form-field>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>{{ i18n.t('leads.notesLabel') }}</mat-label>
        <textarea matInput [(ngModel)]="form.notes" rows="3"></textarea>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="dialogRef.close(null)">{{ i18n.t('leads.cancel') }}</button>
      <button mat-flat-button color="primary" (click)="save()" [disabled]="!form.name">
        {{ data.lead ? i18n.t('leads.save') : i18n.t('leads.create') }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    mat-dialog-content {
      display: flex;
      flex-direction: column;
      min-width: 400px;
    }
    .full-width {
      width: 100%;
    }
  `],
})
export class LeadDialogComponent {
  i18n = inject(I18nService);

  form: any = {
    name: '',
    email: '',
    phone: '',
    source: 'manual',
    tags: '',
    funnel_status: 'novo',
    product_interest: '',
    value: null,
    notes: '',
  };

  constructor(
    public dialogRef: MatDialogRef<LeadDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: LeadDialogData,
  ) {
    if (data.lead) {
      this.form = {
        name: data.lead.name || '',
        email: data.lead.email || '',
        phone: data.lead.phone || '',
        source: data.lead.source || 'manual',
        tags: data.lead.tags || '',
        funnel_status: data.lead.funnel_status || 'novo',
        product_interest: data.lead.product_interest || '',
        value: data.lead.value,
        notes: data.lead.notes || '',
      };
    }
  }

  save(): void {
    if (!this.form.name) return;
    const result: any = { ...this.form };
    // Clean empty strings to null
    for (const key of Object.keys(result)) {
      if (result[key] === '') result[key] = null;
    }
    // Keep name as string
    result.name = this.form.name;
    this.dialogRef.close(result);
  }
}
