import { Component, Inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { Product } from '../../services/product.service';

export interface ProductDialogData {
  product?: Product;
}

@Component({
  selector: 'app-product-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ data.product ? 'Editar Produto' : 'Novo Produto' }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="product-form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Nome</mat-label>
          <input matInput formControlName="name" placeholder="Nome do produto ou servico">
          @if (form.get('name')?.hasError('required') && form.get('name')?.touched) {
            <mat-error>Nome e obrigatorio</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Descricao</mat-label>
          <textarea matInput formControlName="description" rows="3" placeholder="Descreva seu produto ou servico"></textarea>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Preco (R$)</mat-label>
          <input matInput type="number" formControlName="price" placeholder="0.00" step="0.01">
          @if (form.get('price')?.hasError('required') && form.get('price')?.touched) {
            <mat-error>Preco e obrigatorio</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Tipo de Preco</mat-label>
          <mat-select formControlName="pricing_type">
            <mat-option value="one_time">Pagamento Unico</mat-option>
            <mat-option value="monthly">Assinatura Mensal</mat-option>
            <mat-option value="yearly">Assinatura Anual</mat-option>
            <mat-option value="weekly">Assinatura Semanal</mat-option>
            <mat-option value="custom">Personalizado</mat-option>
          </mat-select>
        </mat-form-field>

        @if (form.get('pricing_type')?.value === 'custom') {
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Periodo Personalizado</mat-label>
            <input matInput formControlName="recurrence_period" placeholder="Ex: Trimestral, Semestral">
          </mat-form-field>
        }

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Publico-alvo</mat-label>
          <input matInput formControlName="target_audience" placeholder="Ex: Profissionais 25-45 anos">
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Diferenciais</mat-label>
          <textarea matInput formControlName="differentials" rows="3" placeholder="Ex: Certificado incluso, suporte vitalicio"></textarea>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>URL do Site / Landing Page</mat-label>
          <input matInput formControlName="website_url" placeholder="https://www.seusite.com.br">
          <mat-icon matPrefix>link</mat-icon>
        </mat-form-field>

        <div class="image-upload">
          <button type="button" mat-stroked-button (click)="fileInput.click()">
            <mat-icon>upload</mat-icon>
            {{ selectedFile ? selectedFile.name : 'Selecionar Imagem' }}
          </button>
          <input #fileInput type="file" accept="image/*" (change)="onFileSelected($event)" style="display:none">
          @if (imagePreview) {
            <div class="image-preview">
              <img [src]="imagePreview" alt="Preview">
            </div>
          }
        </div>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancelar</button>
      <button mat-flat-button color="primary" (click)="onSave()" [disabled]="form.invalid">Salvar</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .product-form {
      display: flex;
      flex-direction: column;
      min-width: 400px;
      padding-top: 8px;
    }
    .full-width {
      width: 100%;
    }
    .image-upload {
      margin-top: 8px;
      margin-bottom: 16px;
    }
    .image-preview {
      margin-top: 12px;
      img {
        max-width: 200px;
        max-height: 150px;
        border-radius: 8px;
        object-fit: cover;
      }
    }
  `],
})
export class ProductDialogComponent implements OnInit {
  form!: FormGroup;
  selectedFile: File | null = null;
  imagePreview: string | null = null;

  constructor(
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    public dialogRef: MatDialogRef<ProductDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ProductDialogData,
  ) {}

  ngOnInit(): void {
    const p = this.data.product;
    this.form = this.fb.group({
      name: [p?.name || '', Validators.required],
      description: [p?.description || ''],
      price: [p?.price || null, Validators.required],
      pricing_type: [p?.pricing_type || 'one_time'],
      recurrence_period: [p?.recurrence_period || ''],
      target_audience: [p?.target_audience || ''],
      differentials: [p?.differentials || ''],
      website_url: [p?.website_url || ''],
    });

    if (p?.image_path) {
      const base = window.location.hostname === 'localhost' ? 'http://localhost:8000' : '';
      this.imagePreview = `${base}${p.image_path}`;
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        this.imagePreview = reader.result as string;
        this.cdr.detectChanges();
      };
      reader.readAsDataURL(this.selectedFile);
    }
  }

  onCancel(): void {
    this.dialogRef.close(null);
  }

  onSave(): void {
    if (this.form.invalid) return;

    const formData = new FormData();
    const values = this.form.value;
    formData.append('name', values.name);
    formData.append('price', values.price.toString());
    if (values.description) formData.append('description', values.description);
    formData.append('pricing_type', values.pricing_type || 'one_time');
    if (values.recurrence_period) formData.append('recurrence_period', values.recurrence_period);
    if (values.target_audience) formData.append('target_audience', values.target_audience);
    if (values.differentials) formData.append('differentials', values.differentials);
    if (values.website_url) formData.append('website_url', values.website_url);
    if (this.selectedFile) {
      formData.append('image', this.selectedFile);
    }

    this.dialogRef.close(formData);
  }
}
