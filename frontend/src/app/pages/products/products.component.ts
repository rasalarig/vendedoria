import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ProductService, Product } from '../../services/product.service';
import { I18nService } from '../../services/i18n.service';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
  ],
  template: `
    <div class="products-page">
      <div class="page-header">
        <div>
          <h1>{{ i18n.t('products.title') }}</h1>
          <p class="subtitle">{{ i18n.t('products.subtitle') }}</p>
        </div>
        <button mat-flat-button color="primary" (click)="navigateToNew()" class="new-btn">
          <mat-icon>add</mat-icon>
          {{ i18n.t('products.newProduct') }}
        </button>
      </div>

      @if (products.length === 0 && !loading) {
        <div class="empty-state">
          <div class="empty-icon-wrapper">
            <mat-icon class="empty-icon">inventory_2</mat-icon>
          </div>
          <h2>{{ i18n.t('products.noProducts') }}</h2>
          <p class="empty-hint">{{ i18n.t('products.emptyHint') }}</p>
          <button mat-flat-button color="primary" (click)="navigateToNew()" class="cta-btn">
            <mat-icon>add</mat-icon>
            {{ i18n.t('products.registerFirst') }}
          </button>
        </div>
      }

      <div class="products-grid">
        @for (product of products; track product.id) {
          <div class="product-card" (click)="navigateToProduct(product)">
            <div class="product-image">
              @if (product.image_path) {
                <img [src]="getImageUrl(product.image_path)" [alt]="product.name">
              } @else {
                <div class="image-placeholder">
                  <mat-icon>shopping_bag</mat-icon>
                </div>
              }
              <button class="delete-btn" mat-icon-button (click)="confirmDelete($event, product)" [title]="i18n.t('products.deleteProduct')">
                <mat-icon>delete_outline</mat-icon>
              </button>
            </div>
            <div class="product-info">
              <h3 class="product-name">{{ product.name }}</h3>
              <p class="product-price">{{ formatPrice(product.price) }}</p>
              @if (product.description) {
                <p class="product-description">{{ product.description | slice:0:80 }}{{ product.description.length > 80 ? '...' : '' }}</p>
              }
              @if (product.website_url) {
                <div class="product-url">
                  <mat-icon class="url-icon">link</mat-icon>
                  <span>{{ truncateUrl(product.website_url) }}</span>
                </div>
              }
            </div>
          </div>
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
      align-items: flex-start;
      margin-bottom: 32px;

      h1 {
        font-size: 32px;
        font-weight: 800;
        color: #fafafa;
        margin: 0;
        letter-spacing: -1px;
      }

      .subtitle {
        color: #71717a;
        font-size: 14px;
        margin: 4px 0 0;
      }
    }

    .new-btn {
      border-radius: 10px;
      padding: 8px 24px;
      font-weight: 600;
    }

    .empty-state {
      text-align: center;
      padding: 80px 20px;
      border: 2px dashed #27272a;
      border-radius: 20px;
      background: #18181b;

      .empty-icon-wrapper {
        width: 80px;
        height: 80px;
        margin: 0 auto 20px;
        border-radius: 50%;
        background: rgba(139, 92, 246, 0.1);
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .empty-icon {
        font-size: 40px;
        width: 40px;
        height: 40px;
        color: #8b5cf6;
      }

      h2 {
        font-size: 20px;
        font-weight: 700;
        color: #fafafa;
        margin: 0 0 8px;
      }

      .empty-hint {
        font-size: 14px;
        color: #71717a;
        margin: 0 0 24px;
        max-width: 400px;
        margin-left: auto;
        margin-right: auto;
        line-height: 1.5;
      }

      .cta-btn {
        border-radius: 10px;
        padding: 10px 28px;
        font-weight: 600;
        font-size: 15px;
      }
    }

    .products-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 20px;
    }

    .product-card {
      background: #18181b;
      border: 1px solid #27272a;
      border-radius: 16px;
      overflow: hidden;
      cursor: pointer;
      transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
      position: relative;

      &:hover {
        transform: translateY(-4px) scale(1.01);
        box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
        border-color: #3f3f46;

        .delete-btn {
          opacity: 1;
        }
      }
    }

    .product-image {
      width: 100%;
      height: 180px;
      overflow: hidden;
      background: #09090b;
      position: relative;

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: transform 0.3s ease;
      }

      &:hover img {
        transform: scale(1.05);
      }

      .image-placeholder {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        background: linear-gradient(135deg, #18181b 0%, #09090b 100%);

        mat-icon {
          font-size: 56px;
          width: 56px;
          height: 56px;
          opacity: 0.12;
          color: #8b5cf6;
        }
      }
    }

    .delete-btn {
      position: absolute;
      top: 8px;
      right: 8px;
      opacity: 0;
      transition: opacity 0.2s ease;
      background: rgba(0, 0, 0, 0.7) !important;
      backdrop-filter: blur(8px);

      mat-icon {
        color: #ef4444;
        font-size: 20px;
      }
    }

    .product-info {
      padding: 16px;
    }

    .product-name {
      font-size: 16px;
      font-weight: 600;
      color: #fafafa;
      margin: 0 0 6px;
      letter-spacing: -0.3px;
    }

    .product-price {
      font-size: 24px;
      font-weight: 800;
      color: #22c55e;
      margin: 0 0 8px;
      letter-spacing: -0.5px;
    }

    .product-description {
      font-size: 13px;
      color: #a1a1aa;
      margin: 0 0 8px;
      line-height: 1.5;
    }

    .product-url {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      color: #8b5cf6;
      opacity: 0.8;

      .url-icon {
        font-size: 14px;
        width: 14px;
        height: 14px;
      }
    }

    /* Responsive */
    @media (max-width: 768px) {
      :host {
        padding: 20px 16px;
      }

      .page-header {
        flex-direction: column;
        gap: 16px;

        h1 {
          font-size: 26px;
        }
      }

      .new-btn {
        width: 100%;
        justify-content: center;
        min-height: 44px;
      }

      .products-grid {
        grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
        gap: 16px;
      }

      .empty-state {
        padding: 48px 16px;
      }

      .cta-btn {
        width: 100%;
      }
    }

    @media (max-width: 480px) {
      :host {
        padding: 16px 12px;
      }

      .page-header h1 {
        font-size: 22px;
      }

      .products-grid {
        grid-template-columns: 1fr;
        gap: 14px;
      }

      .product-image {
        height: 160px;
      }

      .product-price {
        font-size: 20px;
      }

      .delete-btn {
        opacity: 1;
      }
    }
  `],
})
export class ProductsComponent implements OnInit {
  products: Product[] = [];
  loading = true;

  constructor(
    private productService: ProductService,
    private router: Router,
    public i18n: I18nService,
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
    const base = window.location.hostname === 'localhost' ? 'http://localhost:8001' : '';
    return base + path;
  }

  formatPrice(price: number): string {
    return 'R$ ' + price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  truncateUrl(url: string): string {
    try {
      const u = new URL(url);
      return u.hostname;
    } catch {
      return url.length > 30 ? url.substring(0, 30) + '...' : url;
    }
  }

  navigateToNew(): void {
    this.router.navigate(['/products/new']);
  }

  navigateToProduct(product: Product): void {
    this.router.navigate(['/products', product.id]);
  }

  confirmDelete(event: MouseEvent, product: Product): void {
    event.stopPropagation();
    const confirmed = window.confirm(`${this.i18n.t('products.confirmDelete')} "${product.name}"?`);
    if (confirmed) {
      this.productService.delete(product.id).subscribe({
        next: () => this.loadProducts(),
      });
    }
  }
}
