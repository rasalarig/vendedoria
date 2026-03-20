import { Component, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ProductService, Product } from '../../services/product.service';
import { ProductDialogComponent, ProductDialogData } from './product-dialog.component';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatDialogModule,
  ],
  template: `
    <div class="products-page">
      <div class="page-header">
        <h1>Produtos / Servicos</h1>
        <button mat-flat-button color="primary" (click)="openDialog()">
          <mat-icon>add</mat-icon>
          Novo Produto
        </button>
      </div>

      @if (products.length === 0 && !loading) {
        <div class="empty-state">
          <mat-icon class="empty-icon">inventory_2</mat-icon>
          <p>Nenhum produto cadastrado ainda.</p>
          <p class="empty-hint">Clique em "Novo Produto" para comecar.</p>
        </div>
      }

      <div class="products-grid">
        @for (product of products; track product.id) {
          <mat-card class="product-card">
            <div class="product-image">
              @if (product.image_path) {
                <img [src]="getImageUrl(product.image_path)" [alt]="product.name">
              } @else {
                <div class="image-placeholder">
                  <mat-icon>image</mat-icon>
                </div>
              }
            </div>
            <mat-card-content>
              <h3 class="product-name">{{ product.name }}</h3>
              <p class="product-price">{{ formatPriceWithType(product) }}</p>
              @if (product.target_audience) {
                <p class="product-audience">
                  <mat-icon class="inline-icon">people</mat-icon>
                  {{ product.target_audience }}
                </p>
              }
              @if (product.description) {
                <p class="product-description">{{ product.description | slice:0:100 }}{{ product.description.length > 100 ? '...' : '' }}</p>
              }
            </mat-card-content>
            <mat-card-actions align="end">
              <button mat-button color="primary" (click)="openDialog(product)">
                <mat-icon>edit</mat-icon> Editar
              </button>
              <button mat-button color="warn" (click)="confirmDelete(product)">
                <mat-icon>delete</mat-icon> Excluir
              </button>
            </mat-card-actions>
          </mat-card>
        }
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      padding: 32px;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 28px;

      h1 {
        font-size: 32px;
        font-weight: 800;
        color: #fafafa;
        margin: 0;
        letter-spacing: -1px;
      }

      button {
        border-radius: 10px;
        padding: 8px 24px;
      }
    }

    .empty-state {
      text-align: center;
      padding: 80px 20px;
      color: #71717a;

      .empty-icon {
        font-size: 64px;
        width: 64px;
        height: 64px;
        opacity: 0.2;
        margin-bottom: 16px;
      }

      p {
        font-size: 18px;
        margin: 8px 0;
      }

      .empty-hint {
        font-size: 14px;
        opacity: 0.7;
      }
    }

    .products-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 20px;
    }

    .product-card {
      background: #18181b !important;
      border: 1px solid #27272a !important;
      border-radius: 16px !important;
      overflow: hidden;
      color: white;
      transition: transform 0.2s ease, box-shadow 0.2s ease;

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        border-color: #3f3f46 !important;
      }
    }

    .product-image {
      width: 100%;
      height: 180px;
      overflow: hidden;
      background: #09090b;

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .image-placeholder {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;

        mat-icon {
          font-size: 64px;
          width: 64px;
          height: 64px;
          opacity: 0.15;
          color: #71717a;
        }
      }
    }

    .product-name {
      font-size: 18px;
      font-weight: 600;
      color: #fafafa;
      margin: 12px 0 4px;
      letter-spacing: -0.3px;
    }

    .product-price {
      font-size: 28px;
      font-weight: 800;
      color: #22c55e;
      margin: 4px 0 8px;
      letter-spacing: -1px;
    }

    .product-audience {
      font-size: 13px;
      color: #71717a;
      display: flex;
      align-items: center;
      gap: 4px;
      margin: 4px 0;

      .inline-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
      }
    }

    .product-description {
      font-size: 13px;
      color: #a1a1aa;
      margin: 8px 0 0;
      line-height: 1.5;
    }

    mat-card-actions {
      padding: 8px 16px !important;
      border-top: 1px solid #27272a;
    }
  `],
})
export class ProductsComponent implements OnInit {
  products: Product[] = [];
  loading = true;

  constructor(
    private productService: ProductService,
    private dialog: MatDialog,
  ) {}

  ngOnInit(): void {
    this.loadProducts();
  }

  loadProducts(): void {
    this.loading = true;
    this.productService.getAll().subscribe({
      next: (products) => {
        this.products = products;
        this.loading = false;
      },
      error: () => {
        this.products = [];
        this.loading = false;
      },
    });
  }

  getImageUrl(path: string): string {
    const base = window.location.hostname === 'localhost' ? 'http://localhost:8000' : '';
    return base + path;
  }

  formatPrice(price: number): string {
    return 'R$ ' + price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  formatPriceWithType(product: Product): string {
    const base = this.formatPrice(product.price);
    switch (product.pricing_type) {
      case 'monthly': return base + '/mes';
      case 'yearly': return base + '/ano';
      case 'weekly': return base + '/semana';
      case 'custom': return base + '/' + (product.recurrence_period || 'periodo');
      default: return base;
    }
  }

  openDialog(product?: Product): void {
    const dialogData: ProductDialogData = { product };
    const dialogRef = this.dialog.open(ProductDialogComponent, {
      width: '500px',
      data: dialogData,
    });

    dialogRef.afterClosed().subscribe((formData: FormData | null) => {
      if (!formData) return;

      if (product) {
        this.productService.update(product.id, formData).subscribe({
          next: () => this.loadProducts(),
        });
      } else {
        this.productService.create(formData).subscribe({
          next: () => this.loadProducts(),
        });
      }
    });
  }

  confirmDelete(product: Product): void {
    const confirmed = window.confirm(`Tem certeza que deseja excluir "${product.name}"?`);
    if (confirmed) {
      this.productService.delete(product.id).subscribe({
        next: () => this.loadProducts(),
      });
    }
  }
}
