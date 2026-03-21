import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  image_url: string | null;
}

interface SellerFace {
  id: string;
  name: string;
  gender: string;
  age_range: string;
  style: string;
  thumbnail_url: string;
  is_custom: boolean;
}

interface Platform {
  id: string;
  label: string;
  desc: string;
  icon: string;
  color: string;
  available: boolean;
}

interface SaleType {
  id: string;
  label: string;
  desc: string;
  icon: string;
  available: boolean;
}

interface WizardStep {
  number: number;
  label: string;
}

@Component({
  selector: 'app-venda-create',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
  ],
  template: `
    <div class="wizard-page">
      <!-- Step indicator -->
      <div class="stepper">
        @for (step of steps; track step.number; let i = $index) {
          <div class="stepper-item"
               [class.completed]="currentStep > step.number"
               [class.active]="currentStep === step.number"
               [class.future]="currentStep < step.number">
            <div class="stepper-circle">
              @if (currentStep > step.number) {
                <mat-icon class="step-check">check</mat-icon>
              } @else {
                {{ step.number }}
              }
            </div>
            <span class="stepper-label">{{ step.label }}</span>
          </div>
          @if (i < steps.length - 1) {
            <div class="stepper-line"
                 [class.completed]="currentStep > step.number"></div>
          }
        }
      </div>

      <!-- Step content -->
      <div class="step-content">

        <!-- Step 1: Escolha o Produto -->
        @if (currentStep === 1) {
          <div class="step-header">
            <h2>Escolha o Produto</h2>
            <p>Selecione qual produto deseja vender</p>
          </div>

          @if (loadingProducts) {
            <div class="loading-state">
              <mat-icon class="spin">hourglass_empty</mat-icon>
              <p>Carregando produtos...</p>
            </div>
          } @else if (products.length === 0) {
            <div class="empty-state">
              <mat-icon>inventory_2</mat-icon>
              <h3>Nenhum produto cadastrado</h3>
              <p>Cadastre um produto antes de iniciar uma venda.</p>
              <button class="btn-primary" (click)="goToProducts()">
                <mat-icon>add</mat-icon>
                Cadastrar Produto
              </button>
            </div>
          } @else {
            <div class="products-grid">
              @for (product of products; track product.id) {
                <div class="product-card"
                     [class.selected]="selectedProduct?.id === product.id"
                     (click)="selectProduct(product)">
                  <div class="product-img">
                    @if (product.image_url) {
                      <img [src]="product.image_url" [alt]="product.name">
                    } @else {
                      <mat-icon>inventory_2</mat-icon>
                    }
                  </div>
                  <div class="product-info">
                    <span class="product-name">{{ product.name }}</span>
                    @if (product.price) {
                      <span class="product-price">R$ {{ product.price | number:'1.2-2' }}</span>
                    }
                  </div>
                  @if (selectedProduct?.id === product.id) {
                    <div class="selected-badge">
                      <mat-icon>check_circle</mat-icon>
                    </div>
                  }
                </div>
              }
            </div>
          }
        }

        <!-- Step 2: Onde vender? -->
        @if (currentStep === 2) {
          <div class="step-header">
            <h2>Onde vender?</h2>
            <p>Escolha a plataforma de anuncios</p>
          </div>

          <div class="platforms-grid">
            @for (platform of platforms; track platform.id) {
              <div class="platform-card"
                   [class.selected]="selectedPlatform?.id === platform.id"
                   [style.--accent]="platform.color"
                   (click)="selectPlatform(platform)">
                <div class="platform-icon-wrap" [style.background]="platform.color + '15'">
                  <mat-icon [style.color]="platform.color">{{ platform.icon }}</mat-icon>
                </div>
                <div class="platform-info">
                  <span class="platform-label">{{ platform.label }}</span>
                  <span class="platform-desc">{{ platform.desc }}</span>
                </div>
                @if (!platform.available) {
                  <span class="badge-soon">Em breve</span>
                }
                @if (selectedPlatform?.id === platform.id) {
                  <div class="selected-badge">
                    <mat-icon>check_circle</mat-icon>
                  </div>
                }
              </div>
            }
          </div>
        }

        <!-- Step 3: Quem sera o ator? -->
        @if (currentStep === 3) {
          <div class="step-header">
            <h2>Quem sera o ator?</h2>
            <p>Escolha o rosto para o video da campanha</p>
          </div>

          @if (loadingFaces) {
            <div class="loading-state">
              <mat-icon class="spin">hourglass_empty</mat-icon>
              <p>Carregando rostos...</p>
            </div>
          } @else {
            <div class="faces-grid">
              @for (face of faces; track face.id) {
                @if (!face.is_custom) {
                  <div class="face-card"
                       [class.selected]="selectedFace?.id === face.id"
                       (click)="selectFace(face)">
                    <div class="face-img-wrap">
                      <img [src]="face.thumbnail_url" [alt]="face.name">
                      @if (selectedFace?.id === face.id) {
                        <div class="check-overlay">
                          <mat-icon>check_circle</mat-icon>
                        </div>
                      }
                    </div>
                    <span class="face-name">{{ face.name }}</span>
                  </div>
                }
              }

              <!-- Upload custom face -->
              @if (!uploadedFaceUrl) {
                <div class="face-card upload-card"
                     [class.selected]="selectedFace?.id?.startsWith('custom')"
                     (click)="triggerUpload()">
                  <div class="face-img-wrap upload-placeholder">
                    @if (uploading) {
                      <mat-icon class="spin">hourglass_empty</mat-icon>
                    } @else {
                      <mat-icon class="upload-icon">add_a_photo</mat-icon>
                    }
                  </div>
                  <span class="face-name">{{ uploading ? 'Enviando...' : 'Enviar sua foto' }}</span>
                </div>
              } @else {
                <div class="face-card"
                     [class.selected]="selectedFace?.id?.startsWith('custom')"
                     (click)="selectCustomFace()">
                  <div class="face-img-wrap">
                    <img [src]="uploadedFaceUrl" alt="Foto personalizada">
                    @if (selectedFace?.id?.startsWith('custom')) {
                      <div class="check-overlay">
                        <mat-icon>check_circle</mat-icon>
                      </div>
                    }
                  </div>
                  <span class="face-name">Personalizado</span>
                  <button class="change-photo-btn" (click)="triggerUpload(); $event.stopPropagation()">Trocar</button>
                </div>
              }
            </div>
            <input
              #fileInput
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              style="display: none"
              (change)="onFileSelected($event)"
            >
          }
        }

        <!-- Step 4: Tipo de Venda -->
        @if (currentStep === 4) {
          <div class="step-header">
            <h2>Tipo de Venda</h2>
            <p>Escolha a estrategia de venda</p>
          </div>

          <div class="sale-types-grid">
            @for (saleType of saleTypes; track saleType.id) {
              <div class="sale-type-card"
                   [class.selected]="selectedSaleType?.id === saleType.id"
                   (click)="selectSaleType(saleType)">
                <div class="sale-type-icon">
                  <mat-icon>{{ saleType.icon }}</mat-icon>
                </div>
                <div class="sale-type-info">
                  <span class="sale-type-label">{{ saleType.label }}</span>
                  <span class="sale-type-desc">{{ saleType.desc }}</span>
                </div>
                @if (!saleType.available) {
                  <span class="badge-soon">Em breve</span>
                }
                @if (selectedSaleType?.id === saleType.id) {
                  <div class="selected-badge">
                    <mat-icon>check_circle</mat-icon>
                  </div>
                }
              </div>
            }
          </div>
        }

        <!-- Step 5: Revisar e Gerar -->
        @if (currentStep === 5) {
          <div class="step-header">
            <h2>Revisar e Gerar</h2>
            <p>Confira tudo antes de lancar sua campanha</p>
          </div>

          <div class="review-grid">
            <div class="review-item">
              <span class="review-label">Produto</span>
              <div class="review-value">
                <mat-icon>inventory_2</mat-icon>
                <span>{{ selectedProduct?.name }}</span>
                @if (selectedProduct?.price) {
                  <span class="review-price">R$ {{ selectedProduct!.price | number:'1.2-2' }}</span>
                }
              </div>
            </div>

            <div class="review-item">
              <span class="review-label">Plataforma</span>
              <div class="review-value">
                <mat-icon>{{ selectedPlatform?.icon }}</mat-icon>
                <span>{{ selectedPlatform?.label }}</span>
              </div>
            </div>

            <div class="review-item">
              <span class="review-label">Ator</span>
              <div class="review-value review-face">
                @if (selectedFace) {
                  <img [src]="getFacePreviewUrl()" [alt]="selectedFace.name" class="review-avatar">
                }
                <span>{{ selectedFace?.name }}</span>
              </div>
            </div>

            <div class="review-item">
              <span class="review-label">Tipo de Venda</span>
              <div class="review-value">
                <mat-icon>{{ selectedSaleType?.icon }}</mat-icon>
                <span>{{ selectedSaleType?.label }}</span>
              </div>
            </div>
          </div>

          <div class="generate-action">
            <button class="btn-generate"
                    [disabled]="generating"
                    (click)="generate()">
              @if (generating) {
                <mat-icon class="spin">hourglass_empty</mat-icon>
                Gerando...
              } @else {
                <mat-icon>rocket_launch</mat-icon>
                Gerar Criativo e Campanha
              }
            </button>
          </div>
        }

        <!-- Step 6: Acompanhar -->
        @if (currentStep === 6) {
          <div class="success-state">
            <div class="success-icon-wrap">
              <mat-icon>check_circle</mat-icon>
            </div>
            <h2>Sua campanha foi criada!</h2>
            <p>Acompanhe os resultados em tempo real.</p>
            <div class="success-actions">
              <button class="btn-primary" (click)="goToMetrics()">
                <mat-icon>monitoring</mat-icon>
                Ver Metricas
              </button>
              <button class="btn-secondary" (click)="goToCampaigns()">
                <mat-icon>campaign</mat-icon>
                Ver Campanhas
              </button>
            </div>
          </div>
        }
      </div>

      <!-- Navigation buttons -->
      @if (currentStep < 6) {
        <div class="wizard-nav">
          @if (currentStep > 1) {
            <button class="btn-back" (click)="prevStep()">
              <mat-icon>arrow_back</mat-icon>
              Voltar
            </button>
          } @else {
            <div></div>
          }

          @if (currentStep < 5) {
            <button class="btn-next"
                    [disabled]="!canAdvance()"
                    (click)="nextStep()">
              Proximo
              <mat-icon>arrow_forward</mat-icon>
            </button>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
      padding: 32px;
      max-width: 960px;
      margin: 0 auto;
    }

    /* Stepper */
    .stepper {
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 40px;
      gap: 0;
      flex-wrap: wrap;
    }

    .stepper-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      min-width: 80px;
    }

    .stepper-circle {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      font-weight: 700;
      border: 2px solid #3f3f46;
      background: #18181b;
      color: #71717a;
      transition: all 0.3s ease;
    }

    .stepper-item.active .stepper-circle {
      border-color: #8b5cf6;
      background: #8b5cf6;
      color: white;
      box-shadow: 0 0 16px rgba(139, 92, 246, 0.4);
    }

    .stepper-item.completed .stepper-circle {
      border-color: #22c55e;
      background: #22c55e;
      color: white;
    }

    .step-check {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .stepper-label {
      font-size: 11px;
      color: #52525b;
      font-weight: 500;
      text-align: center;
      white-space: nowrap;
    }

    .stepper-item.active .stepper-label {
      color: #a78bfa;
    }

    .stepper-item.completed .stepper-label {
      color: #22c55e;
    }

    .stepper-line {
      flex: 1;
      height: 2px;
      background: #27272a;
      min-width: 24px;
      max-width: 60px;
      margin: 0 4px;
      margin-bottom: 22px;
      transition: background 0.3s ease;
    }

    .stepper-line.completed {
      background: #22c55e;
    }

    /* Step content */
    .step-content {
      min-height: 400px;
    }

    .step-header {
      margin-bottom: 28px;

      h2 {
        font-size: 28px;
        font-weight: 800;
        color: #fafafa;
        margin: 0 0 6px;
        letter-spacing: -0.5px;
      }

      p {
        color: #71717a;
        font-size: 15px;
        margin: 0;
      }
    }

    /* Products grid */
    .products-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 16px;
    }

    .product-card {
      background: #18181b;
      border: 2px solid #27272a;
      border-radius: 16px;
      padding: 16px;
      cursor: pointer;
      transition: border-color 0.2s, transform 0.15s, box-shadow 0.2s;
      position: relative;

      &:hover {
        border-color: #3f3f46;
        transform: translateY(-2px);
      }

      &.selected {
        border-color: #8b5cf6;
        box-shadow: 0 0 20px rgba(139, 92, 246, 0.25);
      }
    }

    .product-img {
      width: 100%;
      height: 140px;
      border-radius: 12px;
      overflow: hidden;
      background: #09090b;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 12px;

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      mat-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        color: #27272a;
      }
    }

    .product-info {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .product-name {
      font-size: 15px;
      font-weight: 600;
      color: #e4e4e7;
    }

    .product-price {
      font-size: 14px;
      font-weight: 700;
      color: #22c55e;
    }

    .selected-badge {
      position: absolute;
      top: 12px;
      right: 12px;

      mat-icon {
        color: #8b5cf6;
        font-size: 24px;
        width: 24px;
        height: 24px;
      }
    }

    /* Platforms */
    .platforms-grid {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .platform-card {
      display: flex;
      align-items: center;
      gap: 16px;
      background: #18181b;
      border: 2px solid #27272a;
      border-radius: 16px;
      padding: 20px 24px;
      cursor: pointer;
      transition: border-color 0.2s, transform 0.15s;
      position: relative;

      &:hover {
        border-color: #3f3f46;
        transform: translateX(4px);
      }

      &.selected {
        border-color: #8b5cf6;
        box-shadow: 0 0 16px rgba(139, 92, 246, 0.2);
      }
    }

    .platform-icon-wrap {
      width: 48px;
      height: 48px;
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;

      mat-icon {
        font-size: 26px;
        width: 26px;
        height: 26px;
      }
    }

    .platform-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .platform-label {
      font-size: 16px;
      font-weight: 700;
      color: #fafafa;
    }

    .platform-desc {
      font-size: 13px;
      color: #71717a;
    }

    .badge-soon {
      display: inline-block;
      background: rgba(251, 146, 60, 0.15);
      color: #fb923c;
      font-size: 11px;
      font-weight: 700;
      padding: 3px 10px;
      border-radius: 20px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      flex-shrink: 0;
    }

    /* Faces grid */
    .faces-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
    }

    .face-card {
      background: #18181b;
      border: 2px solid #27272a;
      border-radius: 16px;
      padding: 16px;
      text-align: center;
      cursor: pointer;
      transition: border-color 0.2s, transform 0.15s, box-shadow 0.2s;

      &:hover {
        border-color: #3f3f46;
        transform: translateY(-2px);
      }

      &.selected {
        border-color: #8b5cf6;
        border-width: 3px;
        box-shadow: 0 0 20px rgba(139, 92, 246, 0.25);
      }
    }

    .face-img-wrap {
      position: relative;
      width: 140px;
      height: 140px;
      margin: 0 auto 12px;
      border-radius: 16px;
      overflow: hidden;
      background: #09090b;

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .check-overlay {
        position: absolute;
        inset: 0;
        background: rgba(139, 92, 246, 0.45);
        display: flex;
        align-items: center;
        justify-content: center;

        mat-icon {
          font-size: 40px;
          width: 40px;
          height: 40px;
          color: white;
        }
      }
    }

    .face-name {
      font-size: 14px;
      color: #a1a1aa;
      font-weight: 600;
      display: block;
    }

    .upload-card {
      border-style: dashed;

      &:hover {
        border-color: #8b5cf6;
        border-style: dashed;
      }
    }

    .upload-placeholder {
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .upload-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: #3f3f46;
      transition: color 0.2s;
    }

    .upload-card:hover .upload-icon {
      color: #8b5cf6;
    }

    .change-photo-btn {
      display: inline-block;
      margin-top: 6px;
      background: rgba(139, 92, 246, 0.15);
      color: #a78bfa;
      border: 1px solid rgba(139, 92, 246, 0.3);
      border-radius: 8px;
      padding: 3px 14px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;

      &:hover {
        background: rgba(139, 92, 246, 0.3);
      }
    }

    /* Sale types */
    .sale-types-grid {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .sale-type-card {
      display: flex;
      align-items: flex-start;
      gap: 18px;
      background: #18181b;
      border: 2px solid #27272a;
      border-radius: 16px;
      padding: 24px;
      cursor: pointer;
      transition: border-color 0.2s, transform 0.15s;
      position: relative;

      &:hover {
        border-color: #3f3f46;
        transform: translateX(4px);
      }

      &.selected {
        border-color: #8b5cf6;
        box-shadow: 0 0 16px rgba(139, 92, 246, 0.2);
      }
    }

    .sale-type-icon {
      width: 52px;
      height: 52px;
      border-radius: 14px;
      background: rgba(139, 92, 246, 0.12);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;

      mat-icon {
        font-size: 28px;
        width: 28px;
        height: 28px;
        color: #8b5cf6;
      }
    }

    .sale-type-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .sale-type-label {
      font-size: 18px;
      font-weight: 700;
      color: #fafafa;
    }

    .sale-type-desc {
      font-size: 14px;
      color: #71717a;
      line-height: 1.5;
    }

    /* Review */
    .review-grid {
      display: flex;
      flex-direction: column;
      gap: 16px;
      margin-bottom: 32px;
    }

    .review-item {
      background: #18181b;
      border: 1px solid #27272a;
      border-radius: 14px;
      padding: 18px 22px;
    }

    .review-label {
      font-size: 12px;
      font-weight: 600;
      color: #52525b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      display: block;
      margin-bottom: 8px;
    }

    .review-value {
      display: flex;
      align-items: center;
      gap: 10px;
      color: #e4e4e7;
      font-size: 16px;
      font-weight: 600;

      mat-icon {
        font-size: 22px;
        width: 22px;
        height: 22px;
        color: #8b5cf6;
      }
    }

    .review-price {
      color: #22c55e;
      font-size: 14px;
      margin-left: auto;
    }

    .review-face {
      .review-avatar {
        width: 36px;
        height: 36px;
        border-radius: 10px;
        object-fit: cover;
        border: 2px solid #8b5cf6;
      }
    }

    .generate-action {
      text-align: center;
      padding-top: 8px;
    }

    .btn-generate {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      background: linear-gradient(135deg, #8b5cf6, #7c3aed);
      color: white;
      border: none;
      border-radius: 14px;
      padding: 16px 40px;
      font-size: 18px;
      font-weight: 700;
      cursor: pointer;
      transition: transform 0.15s, box-shadow 0.2s;

      mat-icon {
        font-size: 24px;
        width: 24px;
        height: 24px;
      }

      &:hover:not(:disabled) {
        transform: translateY(-2px);
        box-shadow: 0 8px 32px rgba(139, 92, 246, 0.4);
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }

    /* Success state */
    .success-state {
      text-align: center;
      padding: 60px 0;

      .success-icon-wrap {
        margin-bottom: 24px;

        mat-icon {
          font-size: 80px;
          width: 80px;
          height: 80px;
          color: #22c55e;
        }
      }

      h2 {
        font-size: 28px;
        font-weight: 800;
        color: #fafafa;
        margin: 0 0 8px;
      }

      p {
        font-size: 16px;
        color: #71717a;
        margin: 0 0 32px;
      }
    }

    .success-actions {
      display: flex;
      gap: 14px;
      justify-content: center;
    }

    /* Loading / Empty states */
    .loading-state {
      text-align: center;
      padding: 60px 0;
      color: #71717a;

      mat-icon {
        font-size: 40px;
        width: 40px;
        height: 40px;
        margin-bottom: 12px;
      }

      p {
        margin: 0;
        font-size: 14px;
      }
    }

    .empty-state {
      text-align: center;
      padding: 60px 0;

      mat-icon {
        font-size: 64px;
        width: 64px;
        height: 64px;
        color: #27272a;
        margin-bottom: 16px;
      }

      h3 {
        font-size: 20px;
        font-weight: 700;
        color: #a1a1aa;
        margin: 0 0 8px;
      }

      p {
        font-size: 14px;
        color: #52525b;
        margin: 0 0 24px;
      }
    }

    /* Buttons */
    .btn-primary {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: #8b5cf6;
      color: white;
      border: none;
      border-radius: 10px;
      padding: 10px 24px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s;

      mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
      }

      &:hover {
        background: #7c3aed;
      }
    }

    .btn-secondary {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: #18181b;
      color: #a1a1aa;
      border: 1px solid #27272a;
      border-radius: 10px;
      padding: 10px 24px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      transition: border-color 0.15s, color 0.15s;

      mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
      }

      &:hover {
        border-color: #3f3f46;
        color: #e4e4e7;
      }
    }

    /* Wizard nav */
    .wizard-nav {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 40px;
      padding-top: 24px;
      border-top: 1px solid #27272a;
    }

    .btn-back {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: none;
      color: #71717a;
      border: 1px solid #27272a;
      border-radius: 10px;
      padding: 10px 20px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: border-color 0.15s, color 0.15s;

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }

      &:hover {
        border-color: #3f3f46;
        color: #a1a1aa;
      }
    }

    .btn-next {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #8b5cf6;
      color: white;
      border: none;
      border-radius: 10px;
      padding: 10px 28px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s, transform 0.1s;

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }

      &:hover:not(:disabled) {
        background: #7c3aed;
        transform: translateX(2px);
      }

      &:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }
    }

    /* Utilities */
    .spin {
      animation: spin 1.5s linear infinite;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    /* Responsive */
    @media (max-width: 700px) {
      :host {
        padding: 20px 16px;
      }

      .stepper-label {
        display: none;
      }

      .stepper-line {
        margin-bottom: 0;
      }

      .products-grid {
        grid-template-columns: repeat(2, 1fr);
      }

      .faces-grid {
        grid-template-columns: repeat(2, 1fr);
      }

      .face-img-wrap {
        width: 100px;
        height: 100px;
      }
    }
  `],
})
export class VendaCreateComponent implements OnInit {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  private apiUrl = window.location.hostname === 'localhost'
    ? 'http://localhost:8000/api'
    : '/api';

  currentStep = 1;

  steps: WizardStep[] = [
    { number: 1, label: 'Produto' },
    { number: 2, label: 'Plataforma' },
    { number: 3, label: 'Ator' },
    { number: 4, label: 'Tipo' },
    { number: 5, label: 'Revisar' },
    { number: 6, label: 'Lancar' },
  ];

  // Step 1
  products: Product[] = [];
  loadingProducts = true;
  selectedProduct: Product | null = null;

  // Step 2
  platforms: Platform[] = [
    {
      id: 'meta',
      label: 'Meta Ads',
      desc: 'Facebook + Instagram',
      icon: 'campaign',
      color: '#3b82f6',
      available: true,
    },
    {
      id: 'tiktok',
      label: 'TikTok Ads',
      desc: 'Alcance a geracao Z',
      icon: 'music_note',
      color: '#ec4899',
      available: false,
    },
    {
      id: 'whatsapp',
      label: 'WhatsApp Business',
      desc: 'Venda por mensagem direta',
      icon: 'chat',
      color: '#22c55e',
      available: false,
    },
  ];
  selectedPlatform: Platform | null = null;

  // Step 3
  faces: SellerFace[] = [];
  loadingFaces = false;
  selectedFace: SellerFace | null = null;
  uploading = false;
  uploadedFaceId: string | null = null;
  uploadedFaceUrl: string | null = null;

  // Step 4
  saleTypes: SaleType[] = [
    {
      id: 'direct',
      label: 'Venda Direta',
      desc: 'Campanha unica direcionando para compra imediata. Ideal para produtos com preco acessivel.',
      icon: 'bolt',
      available: true,
    },
    {
      id: 'funnel',
      label: 'Funil de Vendas',
      desc: 'Campanha em 3 etapas: Descoberta, Consideracao e Conversao. Ideal para produtos de ticket alto.',
      icon: 'filter_alt',
      available: false,
    },
  ];
  selectedSaleType: SaleType | null = null;

  // Step 5
  generating = false;

  constructor(
    private http: HttpClient,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.loadProducts();
  }

  private loadProducts(): void {
    this.loadingProducts = true;
    this.http.get<Product[]>(`${this.apiUrl}/products`).subscribe({
      next: (products) => {
        this.products = products;
        this.loadingProducts = false;
      },
      error: () => {
        this.products = [];
        this.loadingProducts = false;
      },
    });
  }

  private loadFaces(): void {
    if (this.faces.length > 0) return;
    this.loadingFaces = true;
    this.http.get<SellerFace[]>(`${this.apiUrl}/sellers/faces`).subscribe({
      next: (faces) => {
        this.faces = faces;
        this.loadingFaces = false;
      },
      error: () => {
        this.faces = [];
        this.loadingFaces = false;
      },
    });
  }

  // Step navigation
  canAdvance(): boolean {
    switch (this.currentStep) {
      case 1: return !!this.selectedProduct;
      case 2: return !!this.selectedPlatform;
      case 3: return !!this.selectedFace;
      case 4: return !!this.selectedSaleType;
      default: return false;
    }
  }

  nextStep(): void {
    if (!this.canAdvance()) return;
    this.currentStep++;
    if (this.currentStep === 3) {
      this.loadFaces();
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  prevStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  // Step 1
  selectProduct(product: Product): void {
    this.selectedProduct = product;
  }

  goToProducts(): void {
    this.router.navigate(['/products']);
  }

  // Step 2
  selectPlatform(platform: Platform): void {
    this.selectedPlatform = platform;
  }

  // Step 3
  selectFace(face: SellerFace): void {
    this.selectedFace = face;
  }

  selectCustomFace(): void {
    if (this.uploadedFaceId && this.uploadedFaceUrl) {
      this.selectedFace = {
        id: this.uploadedFaceId,
        name: 'Personalizado',
        gender: 'other',
        age_range: '',
        style: 'custom',
        thumbnail_url: this.uploadedFaceUrl,
        is_custom: true,
      };
    }
  }

  triggerUpload(): void {
    this.fileInput.nativeElement.value = '';
    this.fileInput.nativeElement.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.uploading = true;
    const formData = new FormData();
    formData.append('file', file);

    this.http.post<{ face_id: string; thumbnail_url: string }>(
      `${this.apiUrl}/sellers/faces/upload`, formData
    ).subscribe({
      next: (result) => {
        this.uploadedFaceId = result.face_id;
        const baseUrl = window.location.hostname === 'localhost'
          ? 'http://localhost:8000'
          : '';
        this.uploadedFaceUrl = baseUrl + result.thumbnail_url;
        this.uploading = false;
        this.selectCustomFace();
      },
      error: () => {
        this.uploading = false;
        window.alert('Erro ao enviar foto. Tente novamente.');
      },
    });
  }

  getFacePreviewUrl(): string {
    if (!this.selectedFace) return '';
    if (this.selectedFace.id.startsWith('custom') && this.uploadedFaceUrl) {
      return this.uploadedFaceUrl;
    }
    return this.selectedFace.thumbnail_url;
  }

  // Step 4
  selectSaleType(saleType: SaleType): void {
    this.selectedSaleType = saleType;
  }

  // Step 5
  generate(): void {
    if (this.generating) return;
    this.generating = true;

    // Simulate generation delay, then go to step 6
    setTimeout(() => {
      this.generating = false;
      this.currentStep = 6;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 2000);
  }

  // Step 6
  goToMetrics(): void {
    this.router.navigate(['/dashboard']);
  }

  goToCampaigns(): void {
    this.router.navigate(['/campaigns']);
  }
}
