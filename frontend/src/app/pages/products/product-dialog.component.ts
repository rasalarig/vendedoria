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
import { I18nService } from '../../services/i18n.service';

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
    <div class="dialog-wrapper">
      <h2 mat-dialog-title class="dialog-title">
        <mat-icon class="title-icon">{{ data.product ? 'edit' : 'add_circle' }}</mat-icon>
        {{ data.product ? i18n.t('products.editProduct') : i18n.t('products.newProduct') }}
      </h2>
      <mat-dialog-content>
        <form [formGroup]="form" class="product-form">
          <!-- Photo Upload Zone -->
          <div
            class="photo-zone"
            [class.has-preview]="imagePreview"
            [class.drag-over]="isDragOver"
            (dragover)="onDragOver($event)"
            (dragleave)="onDragLeave($event)"
            (drop)="onDrop($event)"
            (click)="fileInput.click()"
          >
            @if (imagePreview) {
              <img [src]="imagePreview" alt="Preview" class="photo-preview">
              <div class="photo-overlay">
                <mat-icon>photo_camera</mat-icon>
                <span>{{ i18n.t('products.changePhoto') }}</span>
              </div>
            } @else {
              <mat-icon class="upload-icon">add_photo_alternate</mat-icon>
              <p class="upload-text">{{ i18n.t('products.dragPhoto') }}</p>
              <p class="upload-hint">{{ i18n.t('products.photoFormats') }}</p>
            }
            <input #fileInput type="file" accept="image/*" (change)="onFileSelected($event)" style="display:none">
          </div>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>{{ i18n.t('products.name') }}</mat-label>
            <input matInput formControlName="name" [placeholder]="i18n.t('products.namePlaceholder')">
            @if (form.get('name')?.hasError('required') && form.get('name')?.touched) {
              <mat-error>{{ i18n.t('products.nameRequired') }}</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>{{ i18n.t('products.priceLabel') }}</mat-label>
            <input matInput type="number" formControlName="price" placeholder="0.00" step="0.01">
            @if (form.get('price')?.hasError('required') && form.get('price')?.touched) {
              <mat-error>{{ i18n.t('products.priceRequired') }}</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>{{ i18n.t('products.type') }}</mat-label>
            <mat-select formControlName="product_type">
              <mat-option value="produto">
                <mat-icon>inventory_2</mat-icon> {{ i18n.t('products.product') }}
              </mat-option>
              <mat-option value="servico">
                <mat-icon>design_services</mat-icon> {{ i18n.t('products.service') }}
              </mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>{{ i18n.t('products.paymentType') }}</mat-label>
            <mat-select formControlName="pricing_type">
              <mat-option value="one_time">
                <mat-icon>payments</mat-icon> {{ i18n.t('products.oneTime') }}
              </mat-option>
              <mat-option value="monthly">
                <mat-icon>autorenew</mat-icon> {{ i18n.t('products.monthly') }}
              </mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>{{ i18n.t('products.description') }}</mat-label>
            <textarea matInput formControlName="description" rows="3" [placeholder]="i18n.t('products.descriptionPlaceholder')" maxlength="300"></textarea>
            <mat-hint align="end">{{ form.get('description')?.value?.length || 0 }}/300</mat-hint>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>{{ i18n.t('products.websiteUrl') }}</mat-label>
            <mat-icon matPrefix class="url-prefix-icon">link</mat-icon>
            <input matInput formControlName="website_url" [placeholder]="i18n.t('products.websitePlaceholder')">
          </mat-form-field>
        </form>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button (click)="onCancel()" class="cancel-btn">{{ i18n.t('common.cancel') }}</button>
        <button mat-flat-button color="primary" (click)="onSave()" [disabled]="form.invalid" class="save-btn">
          <mat-icon>check</mat-icon>
          {{ i18n.t('common.save') }}
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .dialog-wrapper {
      min-width: 420px;
    }

    .dialog-title {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 20px;
      font-weight: 700;
      color: #fafafa;
      margin: 0;

      .title-icon {
        color: #8b5cf6;
        font-size: 24px;
        width: 24px;
        height: 24px;
      }
    }

    .product-form {
      display: flex;
      flex-direction: column;
      padding-top: 8px;
    }

    .full-width {
      width: 100%;
    }

    .url-prefix-icon {
      color: #71717a;
      margin-right: 4px;
    }

    .photo-zone {
      width: 100%;
      height: 160px;
      border: 2px dashed #3f3f46;
      border-radius: 14px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s ease;
      margin-bottom: 20px;
      position: relative;
      overflow: hidden;
      background: #09090b;

      &:hover {
        border-color: #8b5cf6;
        background: rgba(139, 92, 246, 0.05);
      }

      &.drag-over {
        border-color: #8b5cf6;
        background: rgba(139, 92, 246, 0.1);
        transform: scale(1.01);
      }

      &.has-preview {
        border-style: solid;
        border-color: #27272a;
      }

      &.has-preview:hover .photo-overlay {
        opacity: 1;
      }
    }

    .upload-icon {
      font-size: 36px;
      width: 36px;
      height: 36px;
      color: #52525b;
      margin-bottom: 8px;
    }

    .upload-text {
      font-size: 14px;
      color: #71717a;
      margin: 0;
    }

    .upload-hint {
      font-size: 12px;
      color: #52525b;
      margin: 4px 0 0;
    }

    .photo-preview {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .photo-overlay {
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.6);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity 0.2s ease;
      color: white;
      gap: 4px;

      mat-icon {
        font-size: 28px;
        width: 28px;
        height: 28px;
      }

      span {
        font-size: 13px;
      }
    }

    .cancel-btn {
      color: #71717a !important;
    }

    .save-btn {
      border-radius: 10px;
      padding: 6px 20px;
      font-weight: 600;

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
        margin-right: 4px;
      }
    }

    /* Responsive */
    @media (max-width: 480px) {
      .dialog-wrapper {
        min-width: unset;
        width: 100%;
      }

      .dialog-title {
        font-size: 18px;
      }

      .photo-zone {
        height: 130px;
      }

      .save-btn {
        min-height: 44px;
        width: 100%;
        justify-content: center;
      }

      .cancel-btn {
        min-height: 44px;
      }
    }
  `],
})
export class ProductDialogComponent implements OnInit {
  form!: FormGroup;
  selectedFile: File | null = null;
  imagePreview: string | null = null;
  isDragOver = false;

  constructor(
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    public dialogRef: MatDialogRef<ProductDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ProductDialogData,
    public i18n: I18nService,
  ) {}

  ngOnInit(): void {
    const p = this.data.product;
    this.form = this.fb.group({
      name: [p?.name || '', Validators.required],
      price: [p?.price || null, Validators.required],
      product_type: [p?.product_type || 'produto'],
      pricing_type: [p?.pricing_type || 'one_time'],
      description: [p?.description || ''],
      website_url: [p?.website_url || ''],
    });

    if (p?.image_path) {
      const base = window.location.hostname === 'localhost' ? 'http://localhost:8001' : '';
      this.imagePreview = `${base}${p.image_path}`;
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
    const files = event.dataTransfer?.files;
    if (files && files.length > 0 && files[0].type.startsWith('image/')) {
      this.setFile(files[0]);
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.setFile(input.files[0]);
    }
  }

  private setFile(file: File): void {
    this.selectedFile = file;
    const reader = new FileReader();
    reader.onload = () => {
      this.imagePreview = reader.result as string;
      this.cdr.detectChanges();
    };
    reader.readAsDataURL(file);
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
    if (values.website_url) formData.append('website_url', values.website_url);
    formData.append('product_type', values.product_type || 'produto');
    formData.append('pricing_type', values.pricing_type || 'one_time');
    if (this.selectedFile) {
      formData.append('image', this.selectedFile);
    }

    this.dialogRef.close(formData);
  }
}
