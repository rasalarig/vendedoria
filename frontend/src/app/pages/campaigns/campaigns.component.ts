import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatSliderModule } from '@angular/material/slider';
import { CampaignService, Campaign, CampaignCreate } from '../../services/campaign.service';
import { ProductService, Product } from '../../services/product.service';
import { VideoCreativeService, GeneratedVideo } from '../../services/video-creative.service';
import { SettingsService } from '../../services/settings.service';
import { Subscription, interval } from 'rxjs';
import { switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-campaigns',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatDividerModule,
    MatSliderModule,
  ],
  template: `
    <div class="campaigns-page">
      <div class="page-header">
        <div>
          <h1>Campanhas</h1>
          <p class="page-subtitle">Crie e gerencie suas campanhas de anuncios</p>
        </div>
        <button class="btn-new-campaign" (click)="toggleWizard()">
          <mat-icon>{{ showWizard ? 'close' : 'add' }}</mat-icon>
          {{ showWizard ? 'Fechar' : 'Nova Campanha' }}
        </button>
      </div>

      <!-- ===== CAMPAIGN CREATION WIZARD ===== -->
      @if (showWizard) {
        <div class="wizard-container">
          <!-- Step indicators -->
          <div class="step-indicators">
            @for (step of stepLabels; track $index) {
              <div class="step-indicator"
                   [class.active]="currentStep === $index"
                   [class.completed]="currentStep > $index"
                   (click)="goToStep($index)">
                <div class="step-number">
                  @if (currentStep > $index) {
                    <mat-icon>check</mat-icon>
                  } @else {
                    {{ $index + 1 }}
                  }
                </div>
                <span class="step-label">{{ step }}</span>
              </div>
              @if ($index < stepLabels.length - 1) {
                <div class="step-connector" [class.completed]="currentStep > $index"></div>
              }
            }
          </div>

          <!-- Step 1: Selecionar Criativo -->
          @if (currentStep === 0) {
            <div class="wizard-step">
              <h2 class="step-title">Selecionar Criativo</h2>
              <p class="step-desc">Escolha um video aprovado para usar na sua campanha</p>

              @if (loadingVideos) {
                <div class="loading-state">
                  <mat-spinner diameter="40"></mat-spinner>
                  <p>Carregando criativos...</p>
                </div>
              } @else if (approvedVideos.length === 0) {
                <div class="empty-creatives">
                  <mat-icon>videocam_off</mat-icon>
                  <p>Voce precisa aprovar um criativo primeiro</p>
                  <button class="btn-go-creatives" (click)="goToCreatives()">
                    <mat-icon>arrow_forward</mat-icon> Ir para Criativos
                  </button>
                </div>
              } @else {
                <div class="creatives-grid">
                  @for (video of approvedVideos; track video.id) {
                    <div class="creative-card"
                         [class.selected]="selectedVideoId === video.id"
                         (click)="selectVideo(video)">
                      <div class="creative-thumbnail">
                        @if (video.thumbnail_url) {
                          <img [src]="video.thumbnail_url" [alt]="video.product_name" (error)="onImageError($event)">
                        } @else {
                          <div class="thumb-placeholder">
                            <mat-icon>videocam</mat-icon>
                          </div>
                        }
                        <div class="duration-badge">{{ formatDuration(video.duration) }}</div>
                      </div>
                      <div class="creative-info">
                        <span class="creative-seller">{{ video.seller_name || 'Vendedor' }}</span>
                        <span class="creative-product">{{ video.product_name || 'Produto' }}</span>
                      </div>
                      @if (selectedVideoId === video.id) {
                        <div class="selected-overlay">
                          <mat-icon>check_circle</mat-icon>
                        </div>
                      }
                    </div>
                  }
                </div>
              }

              <div class="wizard-actions">
                <div></div>
                <button class="btn-next" [disabled]="!selectedVideoId" (click)="nextStep()">
                  Proximo <mat-icon>arrow_forward</mat-icon>
                </button>
              </div>
            </div>
          }

          <!-- Step 2: Escolher Plataformas -->
          @if (currentStep === 1) {
            <div class="wizard-step">
              <h2 class="step-title">Escolher Plataformas</h2>
              <p class="step-desc">Selecione onde seus anuncios serao veiculados</p>

              <div class="platforms-grid">
                <div class="platform-card instagram"
                     [class.selected]="platformInstagram"
                     (click)="platformInstagram = !platformInstagram">
                  <div class="platform-icon-wrap instagram-icon">
                    <mat-icon>photo_camera</mat-icon>
                  </div>
                  <h3>Instagram</h3>
                  <span class="platform-placements">Feed + Stories + Reels</span>
                  @if (platformInstagram) {
                    <div class="platform-check">
                      <mat-icon>check_circle</mat-icon>
                    </div>
                  }
                </div>

                <div class="platform-card tiktok"
                     [class.selected]="platformTikTok"
                     (click)="platformTikTok = !platformTikTok">
                  <div class="platform-icon-wrap tiktok-icon">
                    <mat-icon>music_video</mat-icon>
                  </div>
                  <h3>TikTok</h3>
                  <span class="platform-placements">For You + Feed</span>
                  @if (platformTikTok) {
                    <div class="platform-check">
                      <mat-icon>check_circle</mat-icon>
                    </div>
                  }
                </div>
              </div>

              <div class="wizard-actions">
                <button class="btn-back" (click)="prevStep()">
                  <mat-icon>arrow_back</mat-icon> Voltar
                </button>
                <button class="btn-next" [disabled]="!platformInstagram && !platformTikTok" (click)="nextStep()">
                  Proximo <mat-icon>arrow_forward</mat-icon>
                </button>
              </div>
            </div>
          }

          <!-- Step 3: Definir Orcamento -->
          @if (currentStep === 2) {
            <div class="wizard-step">
              <h2 class="step-title">Quanto quer investir por dia?</h2>
              <p class="step-desc">Defina o orcamento diario e a duracao da campanha</p>

              <div class="budget-section">
                <div class="budget-display">
                  <span class="budget-currency">R$</span>
                  <span class="budget-value">{{ dailyBudget }}</span>
                  <span class="budget-period">/dia</span>
                </div>

                <div class="budget-slider-container">
                  <mat-slider min="10" max="500" step="5" discrete class="budget-slider">
                    <input matSliderThumb [(ngModel)]="dailyBudget" (ngModelChange)="onBudgetChange()">
                  </mat-slider>
                  <div class="slider-labels">
                    <span>R$10</span>
                    <span>R$500</span>
                  </div>
                </div>

                <div class="preset-buttons">
                  <button class="preset-btn" [class.active]="dailyBudget === 20" (click)="setDailyBudget(20)">R$20/dia</button>
                  <button class="preset-btn" [class.active]="dailyBudget === 50" (click)="setDailyBudget(50)">R$50/dia</button>
                  <button class="preset-btn" [class.active]="dailyBudget === 100" (click)="setDailyBudget(100)">R$100/dia</button>
                </div>

                <div class="reach-estimate">
                  <mat-icon>groups</mat-icon>
                  <span>Alcance estimado: ~{{ estimatedReachMin | number:'1.0-0' }} - {{ estimatedReachMax | number:'1.0-0' }} pessoas/dia</span>
                </div>

                <div class="duration-section">
                  <h3 class="duration-title">Duracao da campanha</h3>
                  <div class="duration-options">
                    <button class="duration-btn" [class.active]="campaignDuration === 7" (click)="setCampaignDuration(7)">7 dias</button>
                    <button class="duration-btn" [class.active]="campaignDuration === 14" (click)="setCampaignDuration(14)">14 dias</button>
                    <button class="duration-btn" [class.active]="campaignDuration === 30" (click)="setCampaignDuration(30)">30 dias</button>
                    <button class="duration-btn" [class.active]="campaignDuration === 0" (click)="setCampaignDuration(0)">Continuo</button>
                  </div>
                </div>

                <div class="total-budget-display">
                  <span class="total-label">Total estimado:</span>
                  <span class="total-value">
                    @if (campaignDuration > 0) {
                      R$ {{ (dailyBudget * campaignDuration) | number:'1.2-2' }}
                    } @else {
                      Sem limite (continuo)
                    }
                  </span>
                </div>
              </div>

              <div class="wizard-actions">
                <button class="btn-back" (click)="prevStep()">
                  <mat-icon>arrow_back</mat-icon> Voltar
                </button>
                <button class="btn-next" (click)="nextStep()">
                  Proximo <mat-icon>arrow_forward</mat-icon>
                </button>
              </div>
            </div>
          }

          <!-- Step 4: Revisar e Publicar -->
          @if (currentStep === 3) {
            <div class="wizard-step">
              <h2 class="step-title">Revisar e Publicar</h2>
              <p class="step-desc">Confira os detalhes antes de publicar sua campanha</p>

              <div class="review-card">
                <div class="review-section">
                  <h4 class="review-label">Criativo</h4>
                  <div class="review-creative">
                    @if (selectedVideo) {
                      <div class="review-thumb">
                        @if (selectedVideo.thumbnail_url) {
                          <img [src]="selectedVideo.thumbnail_url" alt="Criativo" (error)="onImageError($event)">
                        } @else {
                          <div class="thumb-placeholder-sm"><mat-icon>videocam</mat-icon></div>
                        }
                      </div>
                      <div class="review-creative-info">
                        <span class="review-product-name">{{ selectedVideo.product_name || 'Produto' }}</span>
                        <span class="review-seller">{{ selectedVideo.seller_name || 'Vendedor' }}</span>
                      </div>
                    }
                  </div>
                </div>

                <mat-divider></mat-divider>

                <div class="review-section">
                  <h4 class="review-label">Plataformas</h4>
                  <div class="review-platforms">
                    @if (platformInstagram) {
                      <span class="review-platform-badge instagram">
                        <mat-icon>photo_camera</mat-icon> Instagram
                      </span>
                    }
                    @if (platformTikTok) {
                      <span class="review-platform-badge tiktok">
                        <mat-icon>music_video</mat-icon> TikTok
                      </span>
                    }
                  </div>
                </div>

                <mat-divider></mat-divider>

                <div class="review-section">
                  <h4 class="review-label">Orcamento</h4>
                  <div class="review-budget">
                    <span>R$ {{ dailyBudget }}/dia por {{ campaignDuration > 0 ? campaignDuration + ' dias' : 'tempo indeterminado' }}</span>
                  </div>
                </div>

                <mat-divider></mat-divider>

                <div class="review-section">
                  <h4 class="review-label">Total</h4>
                  <div class="review-total">
                    @if (campaignDuration > 0) {
                      <span>R$ {{ (dailyBudget * campaignDuration) | number:'1.2-2' }}</span>
                    } @else {
                      <span>Sem limite (continuo)</span>
                    }
                  </div>
                </div>

                <mat-divider></mat-divider>

                <div class="review-section">
                  <h4 class="review-label">Segmentacao</h4>
                  <div class="review-targeting">
                    <mat-icon>smart_toy</mat-icon>
                    <span>Automatico (baseado no produto)</span>
                  </div>
                </div>
              </div>

              <div class="wizard-actions">
                <button class="btn-back" (click)="prevStep()">
                  <mat-icon>arrow_back</mat-icon> Voltar
                </button>
                <button class="btn-publish" [disabled]="creating" (click)="publishCampaign()">
                  @if (creating) {
                    <mat-spinner diameter="20" class="btn-spinner"></mat-spinner>
                    <span>Publicando...</span>
                  } @else {
                    <mat-icon>rocket_launch</mat-icon>
                    <span>Publicar Campanha</span>
                  }
                </button>
              </div>
            </div>
          }
        </div>
      }

      <!-- ===== CAMPAIGN LIST ===== -->
      <div class="campaigns-list-section">
        <h2>Suas Campanhas</h2>

        @if (loadingCampaigns) {
          <div class="loading-state">
            <mat-spinner diameter="40"></mat-spinner>
            <p>Carregando campanhas...</p>
          </div>
        } @else if (campaigns.length === 0) {
          <div class="empty-state">
            <mat-icon class="empty-icon">campaign</mat-icon>
            <p>Nenhuma campanha criada ainda</p>
            <p class="empty-hint">Clique em "Nova Campanha" para criar sua primeira campanha</p>
          </div>
        } @else {
          <div class="campaigns-grid">
            @for (campaign of campaigns; track campaign.id) {
              <div class="campaign-card">
                <div class="campaign-card-header">
                  <div class="campaign-card-title-area">
                    <h3 class="campaign-name">{{ campaign.name }}</h3>
                    <span class="campaign-product">{{ campaign.product_name }}</span>
                  </div>
                  <div class="campaign-status-badge" [ngClass]="'status-' + campaign.status">
                    {{ getStatusLabel(campaign.status) }}
                  </div>
                </div>

                <div class="campaign-card-platforms">
                  <span class="platform-pill facebook">
                    <mat-icon>facebook</mat-icon> Facebook
                  </span>
                  <span class="platform-pill instagram">
                    <mat-icon>photo_camera</mat-icon> Instagram
                  </span>
                </div>

                <div class="campaign-card-budget">
                  <mat-icon>payments</mat-icon>
                  <span>R$ {{ campaign.daily_budget | number:'1.2-2' }}/dia</span>
                </div>

                <div class="campaign-card-metrics">
                  <div class="metric-inline">
                    <span class="metric-val">{{ campaign.impressions | number }}</span>
                    <span class="metric-lbl">impressoes</span>
                  </div>
                  <div class="metric-inline">
                    <span class="metric-val">{{ campaign.clicks | number }}</span>
                    <span class="metric-lbl">cliques</span>
                  </div>
                  <div class="metric-inline">
                    <span class="metric-val">R$ {{ campaign.spent | number:'1.2-2' }}</span>
                    <span class="metric-lbl">gasto</span>
                  </div>
                </div>

                <div class="campaign-card-actions">
                  @if (campaign.status === 'active') {
                    <button class="action-btn pause" (click)="pauseCampaign(campaign)" matTooltip="Pausar">
                      <mat-icon>pause_circle</mat-icon> Pausar
                    </button>
                  } @else if (campaign.status === 'paused' || campaign.status === 'draft') {
                    <button class="action-btn resume" (click)="resumeCampaign(campaign)" matTooltip="Retomar">
                      <mat-icon>play_circle</mat-icon> Retomar
                    </button>
                  }
                  <button class="action-btn delete" (click)="deleteCampaign(campaign)" matTooltip="Excluir">
                    <mat-icon>delete_outline</mat-icon>
                  </button>
                </div>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; padding: 32px; }

    /* ---- Header ---- */
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 28px;
    }
    h1 { font-size: 32px; font-weight: 800; color: #fafafa; margin: 0 0 4px; letter-spacing: -1px; }
    .page-subtitle { font-size: 14px; color: #71717a; margin: 0; }

    .btn-new-campaign {
      display: flex; align-items: center; gap: 8px;
      padding: 12px 24px; border-radius: 12px; border: none;
      background: #8b5cf6; color: white; font-size: 14px; font-weight: 600;
      cursor: pointer; transition: all 0.2s;
      &:hover { background: #7c3aed; transform: translateY(-1px); }
    }
    .btn-new-campaign mat-icon { font-size: 20px; width: 20px; height: 20px; }

    /* ---- Wizard Container ---- */
    .wizard-container {
      background: #18181b; border: 1px solid #27272a; border-radius: 20px;
      padding: 32px; margin-bottom: 32px;
      animation: fadeIn 0.3s ease-out;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-8px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* ---- Step Indicators ---- */
    .step-indicators {
      display: flex; align-items: center; justify-content: center;
      gap: 0; margin-bottom: 36px;
    }
    .step-indicator {
      display: flex; flex-direction: column; align-items: center; gap: 8px;
      cursor: pointer; opacity: 0.4; transition: all 0.2s;
      &.active, &.completed { opacity: 1; }
    }
    .step-number {
      width: 40px; height: 40px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 16px; font-weight: 700; color: #fafafa;
      background: #27272a; border: 2px solid #3f3f46; transition: all 0.2s;
      .active & { background: #8b5cf6; border-color: #8b5cf6; }
      .completed & { background: #22c55e; border-color: #22c55e; }
      mat-icon { font-size: 20px; width: 20px; height: 20px; }
    }
    .step-label { font-size: 12px; color: #71717a; font-weight: 500; white-space: nowrap; }
    .step-indicator.active .step-label { color: #a78bfa; }
    .step-indicator.completed .step-label { color: #4ade80; }
    .step-connector {
      width: 60px; height: 2px; background: #27272a; margin: 0 8px; margin-bottom: 24px;
      transition: background 0.3s;
      &.completed { background: #22c55e; }
    }

    /* ---- Wizard Step Common ---- */
    .wizard-step { max-width: 720px; margin: 0 auto; }
    .step-title { font-size: 24px; font-weight: 700; color: #fafafa; margin: 0 0 8px; }
    .step-desc { font-size: 14px; color: #71717a; margin: 0 0 28px; }

    .wizard-actions {
      display: flex; justify-content: space-between; align-items: center;
      margin-top: 32px; padding-top: 24px; border-top: 1px solid #27272a;
    }
    .btn-back {
      display: flex; align-items: center; gap: 6px;
      padding: 10px 20px; border-radius: 10px; border: 1px solid #3f3f46;
      background: transparent; color: #a1a1aa; font-size: 14px; font-weight: 500;
      cursor: pointer; transition: all 0.2s;
      &:hover { border-color: #71717a; color: #fafafa; }
      mat-icon { font-size: 18px; width: 18px; height: 18px; }
    }
    .btn-next {
      display: flex; align-items: center; gap: 6px;
      padding: 10px 24px; border-radius: 10px; border: none;
      background: #8b5cf6; color: white; font-size: 14px; font-weight: 600;
      cursor: pointer; transition: all 0.2s;
      &:hover { background: #7c3aed; }
      &:disabled { opacity: 0.4; cursor: not-allowed; }
      mat-icon { font-size: 18px; width: 18px; height: 18px; }
    }
    .btn-publish {
      display: flex; align-items: center; gap: 8px;
      padding: 14px 32px; border-radius: 12px; border: none;
      background: linear-gradient(135deg, #22c55e, #16a34a); color: white;
      font-size: 16px; font-weight: 700; cursor: pointer; transition: all 0.2s;
      &:hover { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(34, 197, 94, 0.3); }
      &:disabled { opacity: 0.5; cursor: not-allowed; transform: none; box-shadow: none; }
      mat-icon { font-size: 22px; width: 22px; height: 22px; }
    }
    .btn-spinner { display: inline-block; }

    /* ---- Step 1: Creatives Grid ---- */
    .creatives-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px;
    }
    .creative-card {
      background: #09090b; border: 2px solid #27272a; border-radius: 14px;
      overflow: hidden; cursor: pointer; transition: all 0.2s; position: relative;
      &:hover { border-color: #8b5cf6; transform: translateY(-2px); }
      &.selected { border-color: #8b5cf6; box-shadow: 0 0 24px rgba(139, 92, 246, 0.2); }
    }
    .creative-thumbnail {
      height: 160px; overflow: hidden; background: #09090b; position: relative;
      img { width: 100%; height: 100%; object-fit: cover; }
    }
    .thumb-placeholder {
      width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;
      mat-icon { font-size: 48px; width: 48px; height: 48px; color: #3f3f46; }
    }
    .duration-badge {
      position: absolute; bottom: 8px; right: 8px;
      background: rgba(0,0,0,0.8); color: #fafafa; padding: 2px 8px;
      border-radius: 6px; font-size: 12px; font-weight: 600;
    }
    .creative-info {
      padding: 12px;
      .creative-seller { display: block; font-size: 12px; color: #71717a; margin-bottom: 2px; }
      .creative-product { display: block; font-size: 14px; color: #fafafa; font-weight: 600; }
    }
    .selected-overlay {
      position: absolute; top: 8px; right: 8px;
      color: #8b5cf6; background: rgba(0,0,0,0.7); border-radius: 50%;
      mat-icon { font-size: 28px; width: 28px; height: 28px; }
    }
    .empty-creatives {
      text-align: center; padding: 48px 20px; color: #71717a;
      mat-icon { font-size: 64px; width: 64px; height: 64px; opacity: 0.2; margin-bottom: 16px; display: block; margin-left: auto; margin-right: auto; }
      p { font-size: 16px; margin: 0 0 20px; color: #a1a1aa; }
    }
    .btn-go-creatives {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 10px 24px; border-radius: 10px; border: none;
      background: #8b5cf6; color: white; font-size: 14px; font-weight: 600;
      cursor: pointer; transition: all 0.2s;
      &:hover { background: #7c3aed; }
      mat-icon { font-size: 18px; width: 18px; height: 18px; }
    }

    /* ---- Step 2: Platforms ---- */
    .platforms-grid {
      display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px;
      max-width: 520px; margin: 0 auto;
    }
    .platform-card {
      background: #09090b; border: 2px solid #27272a; border-radius: 16px;
      padding: 32px 24px; text-align: center; cursor: pointer;
      transition: all 0.2s; position: relative;
      &:hover { border-color: #3f3f46; transform: translateY(-2px); }
      &.selected { border-color: #8b5cf6; box-shadow: 0 0 24px rgba(139, 92, 246, 0.15); }
      h3 { font-size: 18px; font-weight: 700; color: #fafafa; margin: 16px 0 8px; }
      .platform-placements { font-size: 13px; color: #71717a; }
    }
    .platform-icon-wrap {
      width: 56px; height: 56px; border-radius: 16px;
      display: inline-flex; align-items: center; justify-content: center;
      mat-icon { font-size: 28px; width: 28px; height: 28px; }
    }
    .instagram-icon {
      background: linear-gradient(135deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888);
      color: white;
    }
    .tiktok-icon {
      background: #000; border: 1px solid #27272a;
      color: #00f2ea;
    }
    .platform-check {
      position: absolute; top: 12px; right: 12px; color: #8b5cf6;
      mat-icon { font-size: 24px; width: 24px; height: 24px; }
    }

    /* ---- Step 3: Budget ---- */
    .budget-section { max-width: 480px; margin: 0 auto; }
    .budget-display {
      text-align: center; margin-bottom: 32px;
      .budget-currency { font-size: 24px; color: #71717a; font-weight: 600; }
      .budget-value { font-size: 64px; font-weight: 800; color: #fafafa; letter-spacing: -2px; }
      .budget-period { font-size: 18px; color: #71717a; font-weight: 500; }
    }
    .budget-slider-container {
      margin-bottom: 24px;
      .budget-slider { width: 100%; }
    }
    .slider-labels {
      display: flex; justify-content: space-between;
      font-size: 12px; color: #52525b; margin-top: -4px;
    }
    .preset-buttons {
      display: flex; gap: 12px; justify-content: center; margin-bottom: 24px;
    }
    .preset-btn {
      padding: 8px 20px; border-radius: 10px; border: 1px solid #3f3f46;
      background: transparent; color: #a1a1aa; font-size: 14px; font-weight: 500;
      cursor: pointer; transition: all 0.2s;
      &:hover { border-color: #8b5cf6; color: #fafafa; }
      &.active { background: rgba(139, 92, 246, 0.1); border-color: #8b5cf6; color: #a78bfa; }
    }
    .reach-estimate {
      display: flex; align-items: center; justify-content: center; gap: 8px;
      padding: 12px 20px; background: rgba(139, 92, 246, 0.06);
      border: 1px solid rgba(139, 92, 246, 0.15); border-radius: 12px;
      color: #a78bfa; font-size: 14px; margin-bottom: 32px;
      mat-icon { font-size: 20px; width: 20px; height: 20px; }
    }
    .duration-section { margin-bottom: 24px; }
    .duration-title {
      font-size: 16px; font-weight: 600; color: #fafafa; margin: 0 0 16px; text-align: center;
    }
    .duration-options {
      display: flex; gap: 12px; justify-content: center;
    }
    .duration-btn {
      padding: 10px 20px; border-radius: 10px; border: 1px solid #3f3f46;
      background: transparent; color: #a1a1aa; font-size: 14px; font-weight: 500;
      cursor: pointer; transition: all 0.2s;
      &:hover { border-color: #8b5cf6; color: #fafafa; }
      &.active { background: rgba(139, 92, 246, 0.1); border-color: #8b5cf6; color: #a78bfa; }
    }
    .total-budget-display {
      text-align: center; padding: 16px; background: #09090b;
      border: 1px solid #27272a; border-radius: 12px;
      .total-label { font-size: 14px; color: #71717a; margin-right: 8px; }
      .total-value { font-size: 20px; font-weight: 700; color: #fafafa; }
    }

    /* ---- Step 4: Review ---- */
    .review-card {
      background: #09090b; border: 1px solid #27272a; border-radius: 16px;
      padding: 24px; max-width: 520px; margin: 0 auto;
    }
    .review-section { padding: 16px 0; }
    .review-section:first-child { padding-top: 0; }
    .review-label {
      font-size: 12px; font-weight: 600; color: #71717a;
      text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 12px;
    }
    .review-creative {
      display: flex; align-items: center; gap: 16px;
    }
    .review-thumb {
      width: 64px; height: 64px; border-radius: 10px; overflow: hidden; flex-shrink: 0;
      background: #18181b;
      img { width: 100%; height: 100%; object-fit: cover; }
    }
    .thumb-placeholder-sm {
      width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;
      mat-icon { font-size: 28px; width: 28px; height: 28px; color: #3f3f46; }
    }
    .review-creative-info {
      .review-product-name { display: block; font-size: 16px; font-weight: 600; color: #fafafa; }
      .review-seller { display: block; font-size: 13px; color: #71717a; margin-top: 2px; }
    }
    .review-platforms { display: flex; gap: 10px; }
    .review-platform-badge {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 6px 14px; border-radius: 10px; font-size: 13px; font-weight: 600;
      mat-icon { font-size: 16px; width: 16px; height: 16px; }
    }
    .review-platform-badge.instagram {
      background: linear-gradient(135deg, rgba(240,148,51,0.15), rgba(188,24,136,0.15));
      color: #f472b6; border: 1px solid rgba(244,114,182,0.2);
    }
    .review-platform-badge.tiktok {
      background: rgba(0,242,234,0.08); color: #00f2ea;
      border: 1px solid rgba(0,242,234,0.2);
    }
    .review-budget { font-size: 16px; color: #fafafa; font-weight: 500; }
    .review-total { font-size: 20px; color: #fafafa; font-weight: 700; }
    .review-targeting {
      display: flex; align-items: center; gap: 8px; color: #a78bfa; font-size: 14px;
      mat-icon { font-size: 18px; width: 18px; height: 18px; }
    }
    mat-divider { border-color: #27272a !important; }

    /* ---- Campaign List ---- */
    .campaigns-list-section {
      margin-top: 8px;
      h2 { font-size: 22px; font-weight: 700; color: #fafafa; margin: 0 0 20px; letter-spacing: -0.5px; }
    }
    .loading-state {
      text-align: center; padding: 40px; color: #71717a;
      p { margin-top: 12px; } mat-spinner { margin: 0 auto; }
    }
    .empty-state {
      text-align: center; padding: 60px 20px; color: #71717a;
      .empty-icon { font-size: 64px; width: 64px; height: 64px; opacity: 0.2; margin-bottom: 12px; }
      p { font-size: 16px; margin: 4px 0; }
      .empty-hint { font-size: 13px; opacity: 0.7; }
    }
    .campaigns-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 16px;
    }
    .campaign-card {
      background: #18181b; border: 1px solid #27272a; border-radius: 16px;
      padding: 20px; transition: transform 0.2s, box-shadow 0.2s;
      &:hover { transform: translateY(-2px); box-shadow: 0 8px 32px rgba(0,0,0,0.3); }
    }
    .campaign-card-header {
      display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;
    }
    .campaign-card-title-area {
      .campaign-name { font-size: 16px; font-weight: 600; color: #fafafa; margin: 0 0 4px; }
      .campaign-product { font-size: 13px; color: #71717a; }
    }
    .campaign-status-badge {
      font-size: 11px; font-weight: 700; padding: 4px 12px; border-radius: 8px;
      text-transform: uppercase; letter-spacing: 0.5px; flex-shrink: 0;
    }
    .status-draft { background: rgba(113,113,122,0.15); color: #a1a1aa; border: 1px solid rgba(113,113,122,0.2); }
    .status-active { background: rgba(34,197,94,0.1); color: #4ade80; border: 1px solid rgba(34,197,94,0.2); }
    .status-paused { background: rgba(245,158,11,0.1); color: #fbbf24; border: 1px solid rgba(245,158,11,0.2); }
    .status-completed { background: rgba(59,130,246,0.1); color: #60a5fa; border: 1px solid rgba(59,130,246,0.2); }
    .status-error { background: rgba(239,68,68,0.1); color: #f87171; border: 1px solid rgba(239,68,68,0.2); }
    .status-mock { background: rgba(59,130,246,0.1); color: #60a5fa; border: 1px solid rgba(59,130,246,0.2); }
    .status-pending { background: rgba(245,158,11,0.1); color: #fbbf24; border: 1px solid rgba(245,158,11,0.2); }

    .campaign-card-platforms {
      display: flex; gap: 8px; margin-bottom: 10px;
    }
    .platform-pill {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: 500;
      mat-icon { font-size: 12px; width: 12px; height: 12px; }
    }
    .platform-pill.facebook { background: rgba(24,119,242,0.1); color: #60a5fa; border: 1px solid rgba(24,119,242,0.2); }
    .platform-pill.instagram { background: linear-gradient(135deg, rgba(240,148,51,0.1), rgba(188,24,136,0.1)); color: #f472b6; border: 1px solid rgba(244,114,182,0.15); }

    .campaign-card-budget {
      display: flex; align-items: center; gap: 6px;
      font-size: 14px; color: #a1a1aa; margin-bottom: 14px;
      mat-icon { font-size: 16px; width: 16px; height: 16px; color: #71717a; }
    }
    .campaign-card-metrics {
      display: flex; gap: 16px; padding: 12px 0;
      border-top: 1px solid #27272a; border-bottom: 1px solid #27272a;
      margin-bottom: 12px;
    }
    .metric-inline {
      .metric-val { display: block; font-size: 16px; font-weight: 700; color: #fafafa; }
      .metric-lbl { display: block; font-size: 11px; color: #71717a; text-transform: uppercase; letter-spacing: 0.3px; }
    }
    .campaign-card-actions {
      display: flex; gap: 8px;
    }
    .action-btn {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 6px 14px; border-radius: 8px; border: 1px solid #3f3f46;
      background: transparent; font-size: 13px; font-weight: 500;
      cursor: pointer; transition: all 0.2s;
      mat-icon { font-size: 16px; width: 16px; height: 16px; }
      &.pause { color: #fbbf24; border-color: rgba(245,158,11,0.3); &:hover { background: rgba(245,158,11,0.1); } }
      &.resume { color: #4ade80; border-color: rgba(34,197,94,0.3); &:hover { background: rgba(34,197,94,0.1); } }
      &.delete { color: #f87171; border-color: rgba(239,68,68,0.2); &:hover { background: rgba(239,68,68,0.1); } }
    }

    /* ---- Mat Slider Theme Override ---- */
    ::ng-deep .budget-slider .mdc-slider__track--active_fill { background: #8b5cf6 !important; border-color: #8b5cf6 !important; }
    ::ng-deep .budget-slider .mdc-slider__thumb-knob { background: #8b5cf6 !important; border-color: #8b5cf6 !important; }
    ::ng-deep .budget-slider .mdc-slider__track--inactive { background: #27272a !important; }
    ::ng-deep .budget-slider .mdc-slider__value-indicator { background: #8b5cf6 !important; }
    ::ng-deep .budget-slider .mdc-slider__value-indicator::before { border-top-color: #8b5cf6 !important; }

    /* ---- Responsive ---- */
    @media (max-width: 768px) {
      :host { padding: 16px; }
      .page-header { flex-direction: column; gap: 16px; }
      .btn-new-campaign { width: 100%; justify-content: center; min-height: 44px; }
      .platforms-grid { grid-template-columns: 1fr; }
      .campaigns-grid { grid-template-columns: 1fr; }
      .creatives-grid { grid-template-columns: repeat(2, 1fr); }
      .step-connector { width: 24px; }
      .step-label { font-size: 10px; }
      .step-number { width: 32px; height: 32px; font-size: 14px; }
      .preset-buttons { flex-wrap: wrap; }
      .duration-options { flex-wrap: wrap; justify-content: center; }
      .wizard-container { padding: 20px 16px; }
      .wizard-step { max-width: 100%; }
      .wizard-actions { flex-direction: row; }
      .btn-next, .btn-back, .btn-publish { min-height: 44px; }
      .btn-publish { width: auto; }
      .campaign-card-metrics { flex-wrap: wrap; gap: 12px; }
      .campaign-card-actions { flex-wrap: wrap; }
      .action-btn { min-height: 44px; }
      .budget-display .budget-value { font-size: 48px; }
      .review-card { padding: 16px; }
    }

    @media (max-width: 480px) {
      :host { padding: 12px 10px; }
      h1 { font-size: 26px; }
      .wizard-container { padding: 16px 12px; }
      .step-indicators { gap: 0; }
      .step-connector { width: 16px; margin: 0 4px; margin-bottom: 24px; }
      .step-label { display: none; }
      .step-number { width: 28px; height: 28px; font-size: 12px; }
      .creatives-grid { grid-template-columns: 1fr; }
      .creative-thumbnail { height: 140px; }
      .budget-display .budget-value { font-size: 40px; }
      .preset-buttons { gap: 8px; }
      .preset-btn { padding: 6px 14px; font-size: 13px; }
      .duration-btn { padding: 8px 14px; font-size: 13px; }
      .platform-card { padding: 20px 16px; }
      .platform-card h3 { font-size: 16px; }
      .campaign-card { padding: 16px; }
    }
  `],
})
export class CampaignsComponent implements OnInit, OnDestroy {
  // Wizard state
  showWizard = false;
  currentStep = 0;
  stepLabels = ['Criativo', 'Plataformas', 'Orcamento', 'Revisar'];

  // Step 1 - Creative
  approvedVideos: GeneratedVideo[] = [];
  loadingVideos = false;
  selectedVideoId: number | null = null;
  selectedVideo: GeneratedVideo | null = null;

  // Step 2 - Platforms
  platformInstagram = true;
  platformTikTok = true;

  // Step 3 - Budget
  dailyBudget = 50;
  campaignDuration = 14; // 0 = continuous
  estimatedReachMin = 0;
  estimatedReachMax = 0;

  // Step 4 - Creating
  creating = false;

  // Campaign list
  campaigns: Campaign[] = [];
  loadingCampaigns = false;
  products: Product[] = [];

  private pollingSubscription: Subscription | null = null;

  constructor(
    private campaignService: CampaignService,
    private productService: ProductService,
    private videoCreativeService: VideoCreativeService,
    private settingsService: SettingsService,
    private snackBar: MatSnackBar,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.loadCampaigns();
    this.loadProducts();
    this.loadApprovedVideos();
    this.calculateReach();
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }

  // ---- Data Loading ----

  loadCampaigns(): void {
    this.loadingCampaigns = true;
    this.campaignService.getAll().subscribe({
      next: (campaigns) => {
        this.campaigns = campaigns;
        this.loadingCampaigns = false;
        // Show wizard by default if no campaigns
        if (this.campaigns.length === 0) {
          this.showWizard = true;
        }
        this.startPolling();
      },
      error: () => {
        this.campaigns = [];
        this.loadingCampaigns = false;
      },
    });
  }

  loadProducts(): void {
    this.productService.getAll().subscribe({
      next: (products) => { this.products = products; },
      error: () => { this.products = []; },
    });
  }

  loadApprovedVideos(): void {
    this.loadingVideos = true;
    this.videoCreativeService.getGeneratedVideos().subscribe({
      next: (videos) => {
        this.approvedVideos = videos.filter(v => v.status === 'approved');
        this.loadingVideos = false;
      },
      error: () => {
        this.approvedVideos = [];
        this.loadingVideos = false;
      },
    });
  }

  startPolling(): void {
    this.stopPolling();
    this.pollingSubscription = interval(30000).pipe(
      switchMap(() => this.campaignService.getAll()),
    ).subscribe({
      next: (campaigns) => { this.campaigns = campaigns; },
      error: () => {},
    });
  }

  stopPolling(): void {
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
      this.pollingSubscription = null;
    }
  }

  // ---- Wizard Navigation ----

  toggleWizard(): void {
    this.showWizard = !this.showWizard;
    if (this.showWizard) {
      this.resetWizard();
    }
  }

  resetWizard(): void {
    this.currentStep = 0;
    this.selectedVideoId = null;
    this.selectedVideo = null;
    this.platformInstagram = true;
    this.platformTikTok = true;
    this.dailyBudget = 50;
    this.campaignDuration = 14;
    this.creating = false;
    this.calculateReach();
  }

  goToStep(step: number): void {
    // Only allow going to completed or current step
    if (step <= this.currentStep) {
      this.currentStep = step;
    }
  }

  nextStep(): void {
    if (this.currentStep < 3) {
      this.currentStep++;
    }
  }

  prevStep(): void {
    if (this.currentStep > 0) {
      this.currentStep--;
    }
  }

  // ---- Step 1: Creative ----

  selectVideo(video: GeneratedVideo): void {
    this.selectedVideoId = video.id;
    this.selectedVideo = video;
  }

  formatDuration(seconds: number): string {
    if (!seconds) return '0s';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) {
      return secs > 0 ? `${mins}m${secs}s` : `${mins}m`;
    }
    return `${secs}s`;
  }

  goToCreatives(): void {
    this.router.navigate(['/vendas']);
  }

  // ---- Step 3: Budget ----

  setDailyBudget(amount: number): void {
    this.dailyBudget = amount;
    this.calculateReach();
  }

  onBudgetChange(): void {
    this.calculateReach();
  }

  setCampaignDuration(days: number): void {
    this.campaignDuration = days;
  }

  calculateReach(): void {
    // Rough estimation: ~100-200 people per R$1 spent
    const baseReach = this.dailyBudget * 100;
    this.estimatedReachMin = Math.round(baseReach * 0.8);
    this.estimatedReachMax = Math.round(baseReach * 2.2);
  }

  // ---- Step 4: Publish ----

  publishCampaign(): void {
    if (!this.selectedVideo) return;

    this.creating = true;

    const totalBudget = this.campaignDuration > 0
      ? this.dailyBudget * this.campaignDuration
      : 0;

    // Find the product associated with this video creative
    const productId = this.selectedVideo.product_id;

    const data: CampaignCreate = {
      product_id: productId,
      daily_budget: this.dailyBudget,
      total_budget: totalBudget,
    };

    this.campaignService.create(data).subscribe({
      next: () => {
        this.creating = false;
        this.showMessage('Campanha publicada com sucesso!');
        this.showWizard = false;
        this.resetWizard();
        this.loadCampaigns();
      },
      error: (err) => {
        this.creating = false;
        const msg = err?.error?.detail || 'Erro ao publicar campanha';
        this.showMessage(msg, true);
      },
    });
  }

  // ---- Campaign List Actions ----

  pauseCampaign(campaign: Campaign): void {
    this.campaignService.pause(campaign.id).subscribe({
      next: (updated) => {
        const idx = this.campaigns.findIndex(c => c.id === campaign.id);
        if (idx >= 0) this.campaigns[idx] = updated;
        this.showMessage('Campanha pausada');
      },
      error: () => this.showMessage('Erro ao pausar campanha', true),
    });
  }

  resumeCampaign(campaign: Campaign): void {
    this.campaignService.resume(campaign.id).subscribe({
      next: (updated) => {
        const idx = this.campaigns.findIndex(c => c.id === campaign.id);
        if (idx >= 0) this.campaigns[idx] = updated;
        this.showMessage('Campanha retomada');
      },
      error: () => this.showMessage('Erro ao retomar campanha', true),
    });
  }

  deleteCampaign(campaign: Campaign): void {
    if (!confirm(`Excluir campanha "${campaign.name}"?`)) return;
    this.campaignService.delete(campaign.id).subscribe({
      next: () => {
        this.campaigns = this.campaigns.filter(c => c.id !== campaign.id);
        this.showMessage('Campanha excluida');
      },
      error: () => this.showMessage('Erro ao excluir campanha', true),
    });
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      draft: 'RASCUNHO',
      active: 'ATIVA',
      paused: 'PAUSADA',
      completed: 'CONCLUIDA',
      error: 'ERRO',
      mock: 'SIMULADO',
      pending: 'PENDENTE',
    };
    return labels[status] || status.toUpperCase();
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
  }

  private showMessage(message: string, isError = false): void {
    this.snackBar.open(message, 'OK', {
      duration: isError ? 6000 : 5000,
      panelClass: isError ? ['snackbar-error'] : ['snackbar-success'],
    });
  }
}
