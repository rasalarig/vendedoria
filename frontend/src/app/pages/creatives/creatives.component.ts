import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CreativeService, Creative } from '../../services/creative.service';
import { ProductService, Product } from '../../services/product.service';
import { SettingsService } from '../../services/settings.service';

@Component({
  selector: 'app-creatives',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatSelectModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatChipsModule,
    MatTooltipModule,
  ],
  template: `
    <div class="creatives-page">
      <!-- Auto mode banner -->
      @if (operationMode === 'auto') {
        <div class="auto-banner">
          <mat-icon>smart_toy</mat-icon>
          <span>Modo Piloto Automatico — criativos sao aprovados automaticamente</span>
        </div>
      }

      <div class="page-header">
        <h1>Gerador de Criativos</h1>
        <div class="header-actions">
          <mat-form-field appearance="outline" class="product-select">
            <mat-label>Selecione um produto</mat-label>
            <mat-select [(value)]="selectedProductId" (selectionChange)="onProductChange()">
              @for (product of products; track product.id) {
                <mat-option [value]="product.id">{{ product.name }}</mat-option>
              }
            </mat-select>
          </mat-form-field>

          <button mat-flat-button color="primary" class="generate-btn"
                  [disabled]="!selectedProductId || generating"
                  (click)="generateCreatives()">
            @if (generating) {
              <mat-spinner diameter="20" class="btn-spinner"></mat-spinner>
              <span>Gerando...</span>
            } @else {
              <mat-icon>auto_fix_high</mat-icon>
              <span>Gerar Criativos com IA</span>
            }
          </button>
        </div>
      </div>

      <!-- Loading state -->
      @if (loading) {
        <div class="loading-state">
          <mat-spinner diameter="48"></mat-spinner>
          <p>Carregando criativos...</p>
        </div>
      }

      <!-- Empty state -->
      @if (!loading && creatives.length === 0) {
        <div class="empty-state">
          <mat-icon class="empty-icon">brush</mat-icon>
          <p>Selecione um produto e clique em "Gerar Criativos" para comecar</p>
          <p class="empty-hint">A IA vai criar 3 variacoes de anuncio com textos persuasivos e imagens</p>
        </div>
      }

      <!-- Generating overlay -->
      @if (generating) {
        <div class="generating-overlay">
          <mat-spinner diameter="64"></mat-spinner>
          <p>A IA esta criando seus criativos...</p>
          <p class="generating-hint">Isso pode levar alguns segundos</p>
        </div>
      }

      <!-- Creatives Grid -->
      @if (!loading && creatives.length > 0 && !generating) {
        <div class="creatives-grid">
          @for (creative of creatives; track creative.id) {
            <mat-card class="creative-card">
              <!-- Variation badge -->
              <div class="variation-badge">#{{ creative.variation }}</div>

              <!-- Status badge -->
              <div class="status-badge" [ngClass]="'status-' + creative.status">
                @if (creative.status === 'pending') { Pendente }
                @if (creative.status === 'approved') { Aprovado }
                @if (creative.status === 'rejected') { Rejeitado }
              </div>

              <!-- Image -->
              <div class="creative-image">
                @if (creative.image_url) {
                  <img [src]="getImageUrl(creative.image_url)" [alt]="creative.headline"
                       (error)="onImageError($event)"
                       loading="lazy">
                  <div class="image-loading-placeholder">
                    <mat-spinner diameter="32"></mat-spinner>
                  </div>
                } @else {
                  <div class="image-placeholder">
                    <mat-icon>image</mat-icon>
                  </div>
                }
              </div>

              <mat-card-content>
                <!-- Headline -->
                <h3 class="creative-headline">{{ creative.headline }}</h3>

                <!-- Copy text -->
                <p class="creative-copy">{{ creative.copy_text }}</p>

                <!-- CTA preview -->
                <div class="cta-preview">
                  <span class="cta-button">{{ creative.cta }}</span>
                </div>
              </mat-card-content>

              <!-- Actions -->
              <mat-card-actions>
                @if (operationMode === 'auto') {
                  <span class="auto-approved-label">
                    <mat-icon>check_circle</mat-icon> Auto-aprovado
                  </span>
                } @else {
                  @if (creative.status === 'pending') {
                    <button mat-button class="approve-btn" (click)="approveCreative(creative)"
                            matTooltip="Aprovar criativo">
                      <mat-icon>check_circle</mat-icon> Aprovar
                    </button>
                    <button mat-button class="reject-btn" (click)="rejectCreative(creative)"
                            matTooltip="Rejeitar criativo">
                      <mat-icon>cancel</mat-icon> Rejeitar
                    </button>
                  }
                }
                <button mat-button class="regenerate-btn" (click)="regenerateCreative(creative)"
                        [disabled]="creative.regenerating"
                        matTooltip="Regenerar este criativo">
                  @if (creative.regenerating) {
                    <mat-spinner diameter="16" class="btn-spinner"></mat-spinner>
                  } @else {
                    <mat-icon>refresh</mat-icon>
                  }
                  Regenerar
                </button>
              </mat-card-actions>
            </mat-card>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; padding: 32px; }

    .auto-banner {
      background: rgba(139, 92, 246, 0.06);
      border: 1px solid rgba(139, 92, 246, 0.2);
      border-radius: 14px;
      padding: 14px 20px;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      gap: 12px;
      color: #a78bfa;
      font-size: 14px;
      mat-icon { color: #8b5cf6; }
    }

    .page-header {
      margin-bottom: 28px;
      h1 { font-size: 32px; font-weight: 800; color: #fafafa; margin: 0 0 16px; letter-spacing: -1px; }
      .header-actions { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
    }

    .product-select { min-width: 280px; }

    .generate-btn {
      border-radius: 10px;
      padding: 8px 24px;
      height: 56px;
      font-size: 15px;
      display: flex;
      align-items: center;
      gap: 8px;
      .btn-spinner { display: inline-block; }
    }

    .loading-state, .generating-overlay { text-align: center; padding: 60px 20px; color: #71717a; p { margin-top: 16px; font-size: 16px; } mat-spinner { margin: 0 auto; } }
    .generating-overlay { color: #a78bfa; .generating-hint { font-size: 13px; opacity: 0.7; } }
    .empty-state { text-align: center; padding: 80px 20px; color: #71717a; .empty-icon { font-size: 64px; width: 64px; height: 64px; opacity: 0.2; margin-bottom: 16px; } p { font-size: 18px; margin: 8px 0; } .empty-hint { font-size: 14px; opacity: 0.7; } }

    .creatives-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 24px; }

    .creative-card {
      background: #18181b !important;
      border: 1px solid #27272a !important;
      border-radius: 16px !important;
      overflow: hidden;
      color: white;
      position: relative;
      transition: transform 0.2s, box-shadow 0.2s;
      &:hover { transform: translateY(-2px); box-shadow: 0 8px 32px rgba(0,0,0,0.3); }
    }

    .variation-badge { position: absolute; top: 12px; left: 12px; background: rgba(9, 9, 11, 0.8); backdrop-filter: blur(8px); color: #8b5cf6; font-weight: 700; font-size: 14px; padding: 4px 12px; border-radius: 8px; z-index: 2; border: 1px solid rgba(139, 92, 246, 0.2); }

    .status-badge { position: absolute; top: 12px; right: 12px; font-size: 11px; font-weight: 700; padding: 4px 12px; border-radius: 8px; z-index: 2; text-transform: uppercase; letter-spacing: 0.5px; }
    .status-pending { background: rgba(245, 158, 11, 0.1); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.2); }
    .status-approved { background: rgba(34, 197, 94, 0.1); color: #4ade80; border: 1px solid rgba(34, 197, 94, 0.2); }
    .status-rejected { background: rgba(239, 68, 68, 0.1); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.2); }

    .creative-image {
      width: 100%; height: 220px; overflow: hidden; background: #09090b; position: relative;
      img { width: 100%; height: 100%; object-fit: cover; position: relative; z-index: 1; }
      .image-loading-placeholder { position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; z-index: 0; }
      .image-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; mat-icon { font-size: 64px; width: 64px; height: 64px; opacity: 0.15; color: #71717a; } }
    }

    .creative-headline { font-size: 18px; font-weight: 600; color: #fafafa; margin: 16px 0 8px; line-height: 1.3; letter-spacing: -0.3px; }
    .creative-copy { font-size: 14px; color: #a1a1aa; line-height: 1.6; margin: 0 0 16px; }
    .cta-preview { margin-bottom: 8px; .cta-button { display: inline-block; background: linear-gradient(135deg, #8b5cf6, #ec4899); color: white; padding: 10px 24px; border-radius: 10px; font-weight: 600; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; } }

    mat-card-actions { padding: 8px 16px 16px !important; display: flex; align-items: center; gap: 4px; flex-wrap: wrap; border-top: 1px solid #27272a; }
    .approve-btn { color: #22c55e !important; }
    .reject-btn { color: #ef4444 !important; }
    .regenerate-btn { color: #8b5cf6 !important; display: flex; align-items: center; gap: 4px; .btn-spinner { display: inline-block; } }
    .auto-approved-label { color: #22c55e; font-size: 13px; display: flex; align-items: center; gap: 4px; mat-icon { font-size: 18px; width: 18px; height: 18px; } }
  `],
})
export class CreativesComponent implements OnInit {
  products: Product[] = [];
  creatives: (Creative & { regenerating?: boolean })[] = [];
  selectedProductId: number | null = null;
  operationMode: string = 'manual';
  loading = false;
  generating = false;

  constructor(
    private creativeService: CreativeService,
    private productService: ProductService,
    private settingsService: SettingsService,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.loadProducts();
    this.loadSettings();
  }

  loadProducts(): void {
    this.productService.getAll().subscribe({
      next: (products) => {
        this.products = products;
      },
      error: () => {
        this.products = [];
      },
    });
  }

  loadSettings(): void {
    this.settingsService.get().subscribe({
      next: (settings) => {
        this.operationMode = settings.operation_mode || 'manual';
      },
    });
  }

  onProductChange(): void {
    if (this.selectedProductId) {
      this.loadCreatives();
    }
  }

  loadCreatives(): void {
    if (!this.selectedProductId) return;
    this.loading = true;
    this.creativeService.getAll(this.selectedProductId).subscribe({
      next: (creatives) => {
        this.creatives = creatives;
        this.loading = false;
      },
      error: () => {
        this.creatives = [];
        this.loading = false;
        this.showMessage('Erro ao carregar criativos', true);
      },
    });
  }

  generateCreatives(): void {
    if (!this.selectedProductId) return;
    this.generating = true;
    this.creativeService.generate(this.selectedProductId).subscribe({
      next: (creatives) => {
        this.creatives = creatives;
        this.generating = false;
        this.showMessage('Criativos gerados com sucesso!');
      },
      error: () => {
        this.generating = false;
        this.showMessage('Erro ao gerar criativos', true);
      },
    });
  }

  approveCreative(creative: Creative): void {
    this.creativeService.approve(creative.id).subscribe({
      next: (updated) => {
        const idx = this.creatives.findIndex(c => c.id === creative.id);
        if (idx >= 0) this.creatives[idx] = { ...this.creatives[idx], ...updated };
        this.showMessage('Criativo aprovado!');
      },
      error: () => this.showMessage('Erro ao aprovar', true),
    });
  }

  rejectCreative(creative: Creative): void {
    this.creativeService.reject(creative.id).subscribe({
      next: (updated) => {
        const idx = this.creatives.findIndex(c => c.id === creative.id);
        if (idx >= 0) this.creatives[idx] = { ...this.creatives[idx], ...updated };
        this.showMessage('Criativo rejeitado');
      },
      error: () => this.showMessage('Erro ao rejeitar', true),
    });
  }

  regenerateCreative(creative: Creative & { regenerating?: boolean }): void {
    creative.regenerating = true;
    this.creativeService.regenerate(creative.id).subscribe({
      next: (updated) => {
        const idx = this.creatives.findIndex(c => c.id === creative.id);
        if (idx >= 0) this.creatives[idx] = { ...updated, regenerating: false };
        this.showMessage('Criativo regenerado!');
      },
      error: () => {
        creative.regenerating = false;
        this.showMessage('Erro ao regenerar', true);
      },
    });
  }

  getImageUrl(url: string | undefined | null): string {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `http://localhost:8000${url}`;
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
  }

  private showMessage(message: string, isError = false): void {
    this.snackBar.open(message, 'OK', {
      duration: 3000,
      panelClass: isError ? ['snackbar-error'] : ['snackbar-success'],
    });
  }
}
