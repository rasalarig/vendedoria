import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatStepperModule } from '@angular/material/stepper';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { CampaignService, Campaign, CampaignCreate } from '../../services/campaign.service';
import { ProductService, Product } from '../../services/product.service';
import { CreativeService, Creative } from '../../services/creative.service';
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
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    MatStepperModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatChipsModule,
    MatTooltipModule,
    MatDividerModule,
  ],
  template: `
    <div class="campaigns-page">
      <h1>Campanhas Meta Ads</h1>
      <p class="page-subtitle">Seus anuncios sao veiculados automaticamente no Facebook e Instagram</p>

      <!-- Mode Indicator Banner -->
      @if (campaignMode === 'production') {
        <div class="mode-banner mode-production">
          <mat-icon>radio_button_checked</mat-icon>
          <span>Modo Producao - Campanhas reais no Meta Ads</span>
        </div>
      } @else if (campaignMode === 'demo') {
        <div class="mode-banner mode-demo">
          <mat-icon>radio_button_checked</mat-icon>
          <span>Modo Demonstracao - Configure suas credenciais Meta nas Configuracoes</span>
        </div>
      } @else if (campaignMode === 'development') {
        <div class="mode-banner mode-development">
          <mat-icon>warning</mat-icon>
          <span>App Meta em modo Development - Mude para Live em <a href="https://developers.facebook.com/apps/" target="_blank" rel="noopener">developers.facebook.com</a></span>
        </div>
      }

      <!-- Section 1: Create Campaign -->
      <mat-card class="create-section">
        <mat-card-header>
          <mat-card-title>
            <mat-icon>add_circle</mat-icon> Criar Nova Campanha
          </mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <mat-stepper #stepper linear class="campaign-stepper">
            <!-- Step 1: Select Product -->
            <mat-step [completed]="!!selectedProductId">
              <ng-template matStepLabel>Selecionar Produto</ng-template>
              <div class="step-content">
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Produto</mat-label>
                  <mat-select [(value)]="selectedProductId" (selectionChange)="onProductSelected()">
                    @for (product of products; track product.id) {
                      <mat-option [value]="product.id">{{ product.name }} - R$ {{ product.price | number:'1.2-2' }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
                @if (products.length === 0) {
                  <div class="warning-box">
                    <mat-icon>warning</mat-icon>
                    <span>Nenhum produto cadastrado. Cadastre produtos primeiro.</span>
                  </div>
                }
                <div class="step-actions">
                  <button mat-flat-button color="primary" matStepperNext [disabled]="!selectedProductId">
                    Proximo <mat-icon>arrow_forward</mat-icon>
                  </button>
                </div>
              </div>
            </mat-step>

            <!-- Step 2: Select Creative -->
            <mat-step [completed]="!!selectedCreativeId || noCreativesAvailable">
              <ng-template matStepLabel>Selecionar Criativo</ng-template>
              <div class="step-content">
                @if (loadingCreatives) {
                  <div class="loading-inline">
                    <mat-spinner diameter="32"></mat-spinner>
                    <span>Carregando criativos...</span>
                  </div>
                } @else if (approvedCreatives.length === 0) {
                  <div class="warning-box">
                    <mat-icon>warning</mat-icon>
                    <span>Nenhum criativo aprovado. Gere e aprove criativos primeiro.</span>
                  </div>
                } @else {
                  <p class="step-hint">Selecione um criativo aprovado para sua campanha:</p>
                  <div class="creatives-select-grid">
                    @for (creative of approvedCreatives; track creative.id) {
                      <div class="creative-select-card"
                           [class.selected]="selectedCreativeId === creative.id"
                           (click)="selectCreative(creative.id)">
                        <div class="creative-select-image">
                          @if (creative.image_url) {
                            <img [src]="creative.image_url" [alt]="creative.headline" (error)="onImageError($event)">
                          } @else {
                            <div class="image-placeholder-sm">
                              <mat-icon>image</mat-icon>
                            </div>
                          }
                        </div>
                        <div class="creative-select-info">
                          <strong>{{ creative.headline }}</strong>
                          <span class="creative-cta-badge">{{ creative.cta }}</span>
                        </div>
                        @if (selectedCreativeId === creative.id) {
                          <div class="selected-check">
                            <mat-icon>check_circle</mat-icon>
                          </div>
                        }
                      </div>
                    }
                  </div>
                }
                <div class="step-actions">
                  <button mat-button matStepperPrevious>
                    <mat-icon>arrow_back</mat-icon> Voltar
                  </button>
                  <button mat-flat-button color="primary" matStepperNext
                          [disabled]="approvedCreatives.length > 0 && !selectedCreativeId">
                    Proximo <mat-icon>arrow_forward</mat-icon>
                  </button>
                </div>
              </div>
            </mat-step>

            <!-- Step 3: Configure Campaign -->
            <mat-step>
              <ng-template matStepLabel>Configurar Campanha</ng-template>
              <div class="step-content">
                @if (targetingSuggestion) {
                  <div class="ai-strategy-box">
                    <div class="ai-strategy-header">
                      <mat-icon>smart_toy</mat-icon>
                      <span>Sugestao da IA - Targeting Inteligente</span>
                    </div>
                    <pre class="ai-strategy-text">{{ targetingSuggestion }}</pre>
                  </div>

                  <div class="targeting-summary">
                    <div class="targeting-item">
                      <span class="targeting-label">Faixa Etaria:</span>
                      <span>{{ targetingData?.age_min }} - {{ targetingData?.age_max }} anos</span>
                    </div>
                    <div class="targeting-item">
                      <span class="targeting-label">Interesses:</span>
                      <div class="interests-chips">
                        @for (interest of targetingData?.interests || []; track interest) {
                          <span class="interest-chip">{{ interest }}</span>
                        }
                      </div>
                    </div>
                    <div class="targeting-item">
                      <span class="targeting-label">Posicionamentos:</span>
                      <span>Facebook Feed, Facebook Stories, Instagram Feed, Instagram Stories, Instagram Reels, Instagram Explore</span>
                    </div>
                  </div>
                }

                <div class="budget-fields">
                  <mat-form-field appearance="outline">
                    <mat-label>Orcamento Diario (R$)</mat-label>
                    <input matInput type="number" [(ngModel)]="dailyBudget" min="1" step="5">
                    <mat-hint>Valor investido por dia</mat-hint>
                  </mat-form-field>

                  <mat-form-field appearance="outline">
                    <mat-label>Orcamento Total (R$)</mat-label>
                    <input matInput type="number" [(ngModel)]="totalBudget" min="0" step="50">
                    <mat-hint>Limite total da campanha (0 = sem limite)</mat-hint>
                  </mat-form-field>
                </div>

                <div class="step-actions">
                  <button mat-button matStepperPrevious>
                    <mat-icon>arrow_back</mat-icon> Voltar
                  </button>
                  <button mat-flat-button color="primary"
                          [disabled]="creating || dailyBudget <= 0"
                          (click)="createCampaign()">
                    @if (creating) {
                      <mat-spinner diameter="20" class="btn-spinner"></mat-spinner>
                      <span>Criando...</span>
                    } @else {
                      <mat-icon>rocket_launch</mat-icon>
                      <span>Criar Campanha</span>
                    }
                  </button>
                </div>
              </div>
            </mat-step>
          </mat-stepper>
        </mat-card-content>
      </mat-card>

      <!-- Section 2: Campaign List -->
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
            <p class="empty-hint">Use o formulario acima para criar sua primeira campanha</p>
          </div>
        } @else {
          @if (showPageHelper) {
            <div class="page-helper-banner">
              <div class="page-helper-content">
                <div class="page-helper-icon">
                  <mat-icon>storefront</mat-icon>
                </div>
                <div class="page-helper-text">
                  <h3>Pagina do Facebook necessaria</h3>
                  <p>Sua conta Meta precisa ser reconectada com permissoes atualizadas. Clique no botao abaixo - voce sera redirecionado para o Facebook para autorizar.</p>
                </div>
              </div>
              <div class="page-helper-actions">
                <button mat-flat-button color="primary" (click)="reconnectMeta()" class="reconnect-btn">
                  <mat-icon>sync</mat-icon> Reconectar conta Meta (recomendado)
                </button>
                <button mat-button (click)="retryAfterPageCreated()" class="retry-btn">
                  <mat-icon>refresh</mat-icon> Tentar novamente
                </button>
                <button mat-button (click)="dismissPageHelper()" class="dismiss-btn">
                  Fechar
                </button>
              </div>
              <div class="page-helper-secondary">
                <span class="secondary-text">Nao tem pagina?</span>
                <a href="https://www.facebook.com/pages/creation/" target="_blank" class="create-page-link">
                  Criar Pagina do Facebook <mat-icon>open_in_new</mat-icon>
                </a>
              </div>
            </div>
          }
          <div class="campaigns-grid">
            @for (campaign of campaigns; track campaign.id) {
              <mat-card class="campaign-card">
                <mat-card-header>
                  <mat-card-title class="campaign-title">{{ campaign.name }}</mat-card-title>
                  <mat-card-subtitle>{{ campaign.product_name }}</mat-card-subtitle>
                </mat-card-header>

                <!-- Status Badge -->
                <div class="campaign-badges">
                  <div class="campaign-status-badge" [ngClass]="'status-' + campaign.status">
                    {{ getStatusLabel(campaign.status) }}
                  </div>
                  @if (isIncomplete(campaign)) {
                    <div class="campaign-incomplete-badge">
                      <mat-icon>warning_amber</mat-icon> Incompleta
                    </div>
                  }
                </div>

                <mat-card-content>
                  <!-- Platform Badges -->
                  <div class="platform-badges">
                    <span class="platform-badge facebook">
                      <mat-icon>facebook</mat-icon> Facebook
                    </span>
                    <span class="platform-badge instagram">
                      <mat-icon>photo_camera</mat-icon> Instagram
                    </span>
                  </div>

                  <!-- Metrics -->
                  <div class="metrics-grid">
                    <div class="metric-item">
                      <span class="metric-value">{{ campaign.impressions | number }}</span>
                      <span class="metric-label">Impressoes</span>
                    </div>
                    <div class="metric-item">
                      <span class="metric-value">{{ campaign.clicks | number }}</span>
                      <span class="metric-label">Cliques</span>
                    </div>
                    <div class="metric-item">
                      <span class="metric-value metric-ctr" [class.good-metric]="campaign.ctr >= 2" [class.bad-metric]="campaign.ctr < 1">
                        {{ campaign.ctr | number:'1.2-2' }}%
                      </span>
                      <span class="metric-label">CTR</span>
                    </div>
                    <div class="metric-item">
                      <span class="metric-value metric-cpc" [class.good-metric]="campaign.cpc < 1" [class.bad-metric]="campaign.cpc > 5">
                        R$ {{ campaign.cpc | number:'1.2-2' }}
                      </span>
                      <span class="metric-label">CPC</span>
                    </div>
                    <div class="metric-item">
                      <span class="metric-value">{{ campaign.leads | number }}</span>
                      <span class="metric-label">Leads</span>
                    </div>
                    <div class="metric-item">
                      <span class="metric-value">R$ {{ campaign.spent | number:'1.2-2' }}</span>
                      <span class="metric-label">Gasto</span>
                    </div>
                  </div>

                  <mat-divider></mat-divider>

                  <div class="campaign-budget-info">
                    <span>Orcamento diario: <strong>R$ {{ campaign.daily_budget | number:'1.2-2' }}</strong></span>
                    @if (campaign.total_budget > 0) {
                      <span>Total: <strong>R$ {{ campaign.total_budget | number:'1.2-2' }}</strong></span>
                    }
                  </div>

                  @if (expandedCampaignId === campaign.id) {
                    <mat-divider></mat-divider>
                    <div class="campaign-details">
                      <!-- Campaign Dashboard -->
                      <div class="campaign-dashboard">
                        <h4><mat-icon>analytics</mat-icon> Dashboard de Metricas</h4>
                        <div class="dashboard-kpis">
                          <div class="kpi-card">
                            <div class="kpi-icon impressions-icon"><mat-icon>visibility</mat-icon></div>
                            <div class="kpi-content">
                              <span class="kpi-value">{{ campaign.impressions | number }}</span>
                              <span class="kpi-label">Impressoes</span>
                            </div>
                          </div>
                          <div class="kpi-card">
                            <div class="kpi-icon clicks-icon"><mat-icon>touch_app</mat-icon></div>
                            <div class="kpi-content">
                              <span class="kpi-value">{{ campaign.clicks | number }}</span>
                              <span class="kpi-label">Cliques</span>
                            </div>
                          </div>
                          <div class="kpi-card">
                            <div class="kpi-icon conversions-icon"><mat-icon>shopping_cart</mat-icon></div>
                            <div class="kpi-content">
                              <span class="kpi-value">{{ campaign.conversions | number }}</span>
                              <span class="kpi-label">Conversoes</span>
                            </div>
                          </div>
                          <div class="kpi-card">
                            <div class="kpi-icon leads-icon"><mat-icon>person_add</mat-icon></div>
                            <div class="kpi-content">
                              <span class="kpi-value">{{ campaign.leads | number }}</span>
                              <span class="kpi-label">Leads</span>
                            </div>
                          </div>
                          <div class="kpi-card">
                            <div class="kpi-icon ctr-icon"><mat-icon>ads_click</mat-icon></div>
                            <div class="kpi-content">
                              <span class="kpi-value" [class.good-metric]="campaign.ctr >= 2" [class.bad-metric]="campaign.ctr < 1">{{ campaign.ctr | number:'1.2-2' }}%</span>
                              <span class="kpi-label">CTR</span>
                            </div>
                          </div>
                          <div class="kpi-card">
                            <div class="kpi-icon cpc-icon"><mat-icon>payments</mat-icon></div>
                            <div class="kpi-content">
                              <span class="kpi-value" [class.good-metric]="campaign.cpc < 1" [class.bad-metric]="campaign.cpc > 5">R$ {{ campaign.cpc | number:'1.2-2' }}</span>
                              <span class="kpi-label">CPC</span>
                            </div>
                          </div>
                          <div class="kpi-card">
                            <div class="kpi-icon cpl-icon"><mat-icon>price_check</mat-icon></div>
                            <div class="kpi-content">
                              <span class="kpi-value">R$ {{ campaign.cpl | number:'1.2-2' }}</span>
                              <span class="kpi-label">CPL</span>
                            </div>
                          </div>
                          <div class="kpi-card spent-card">
                            <div class="kpi-icon spent-icon"><mat-icon>account_balance_wallet</mat-icon></div>
                            <div class="kpi-content">
                              <span class="kpi-value">R$ {{ campaign.spent | number:'1.2-2' }}</span>
                              <span class="kpi-label">Gasto Total</span>
                            </div>
                          </div>
                        </div>

                        @if (campaign.status === 'active' || campaign.status === 'mock') {
                          <div class="polling-indicator">
                            <div class="pulse-dot"></div>
                            <span>Atualizando metricas automaticamente a cada 30s</span>
                          </div>
                        }
                      </div>
                      <mat-divider></mat-divider>

                      <!-- Meta Components Status -->
                      <div class="detail-section">
                        <h4>Componentes no Meta</h4>
                        <div class="components-grid">
                          <div class="component-item">
                            <span class="component-badge" [ngClass]="'badge-' + getComponentStatus(campaign.meta_campaign_id)">
                              {{ getComponentStatus(campaign.meta_campaign_id) === 'ok' ? 'Criado' : getComponentStatus(campaign.meta_campaign_id) === 'mock' ? 'Simulado' : 'Faltando' }}
                            </span>
                            <span class="component-label">Campanha</span>
                            @if (campaign.meta_campaign_id && !campaign.meta_campaign_id.startsWith('mock_')) {
                              <span class="component-id">{{ campaign.meta_campaign_id }}</span>
                            }
                          </div>
                          <div class="component-item">
                            <span class="component-badge" [ngClass]="'badge-' + getComponentStatus(campaign.meta_adset_id)">
                              {{ getComponentStatus(campaign.meta_adset_id) === 'ok' ? 'Criado' : getComponentStatus(campaign.meta_adset_id) === 'mock' ? 'Simulado' : 'Faltando' }}
                            </span>
                            <span class="component-label">Conjunto de Anuncios</span>
                          </div>
                          <div class="component-item">
                            <span class="component-badge" [ngClass]="'badge-' + getComponentStatus(campaign.meta_creative_id)">
                              {{ getComponentStatus(campaign.meta_creative_id) === 'ok' ? 'Criado' : getComponentStatus(campaign.meta_creative_id) === 'mock' ? 'Simulado' : 'Faltando' }}
                            </span>
                            <span class="component-label">Criativo</span>
                          </div>
                          <div class="component-item">
                            <span class="component-badge" [ngClass]="'badge-' + getComponentStatus(campaign.meta_ad_id)">
                              {{ getComponentStatus(campaign.meta_ad_id) === 'ok' ? 'Criado' : getComponentStatus(campaign.meta_ad_id) === 'mock' ? 'Simulado' : 'Faltando' }}
                            </span>
                            <span class="component-label">Anuncio</span>
                          </div>
                        </div>
                      </div>

                      <!-- Creative Preview -->
                      @if (campaign.creative_headline || campaign.creative_copy) {
                        <div class="detail-section">
                          <h4>Preview do Criativo</h4>
                          <div class="creative-preview">
                            @if (campaign.creative_image_url) {
                              <div class="preview-image">
                                <img [src]="campaign.creative_image_url" alt="Preview" (error)="onImageError($event)">
                              </div>
                            }
                            <div class="preview-text">
                              @if (campaign.creative_headline) {
                                <strong class="preview-headline">{{ campaign.creative_headline }}</strong>
                              }
                              @if (campaign.creative_copy) {
                                <p class="preview-copy">{{ campaign.creative_copy }}</p>
                              }
                              @if (campaign.creative_cta) {
                                <span class="preview-cta">{{ campaign.creative_cta }}</span>
                              }
                            </div>
                          </div>
                        </div>
                      }

                      <!-- Targeting -->
                      @if (campaign.targeting) {
                        <div class="detail-section">
                          <h4>Targeting</h4>
                          <div class="targeting-detail">
                            <span>Idade: {{ campaign.targeting.age_min || '?' }}-{{ campaign.targeting.age_max || '?' }} anos</span>
                            @if (campaign.targeting.interests?.length) {
                              <div class="detail-interests">
                                @for (interest of campaign.targeting.interests; track interest) {
                                  <span class="interest-chip-sm">{{ interest }}</span>
                                }
                              </div>
                            }
                          </div>
                        </div>
                      }

                      <!-- Errors -->
                      @if (campaign.meta_errors?.length) {
                        <div class="detail-section errors-section">
                          <h4><mat-icon>error_outline</mat-icon> Erros</h4>
                          <ul class="error-list">
                            @for (error of campaign.meta_errors; track error) {
                              <li>{{ error }}</li>
                            }
                          </ul>
                        </div>
                      }
                    </div>
                  }
                </mat-card-content>

                <mat-card-actions>
                  @if (campaign.meta_campaign_id) {
                    <a mat-button class="meta-link-btn"
                       [href]="getAdsManagerLink(campaign)" target="_blank"
                       matTooltip="Abrir no Gerenciador de Anuncios">
                      <mat-icon>open_in_new</mat-icon> Ver no Meta Ads
                    </a>
                  }
                  @if (campaign.meta_campaign_id && !campaign.meta_campaign_id.startsWith('mock_') && campaign.status !== 'active') {
                    <button mat-button class="activate-btn"
                            [disabled]="activatingId === campaign.id"
                            (click)="activateCampaign(campaign)"
                            matTooltip="Ativar campanha no Meta Ads (comeca a gastar orcamento)">
                      @if (activatingId === campaign.id) {
                        <mat-spinner diameter="16" class="btn-spinner"></mat-spinner>
                        <span>Preparando...</span>
                      } @else {
                        <mat-icon>power_settings_new</mat-icon> Ativar no Meta
                      }
                    </button>
                  }
                  @if (isIncomplete(campaign) && campaign.status === 'active') {
                    <button mat-button class="activate-btn"
                            [disabled]="activatingId === campaign.id"
                            (click)="activateCampaign(campaign)"
                            matTooltip="Completar componentes faltantes e reativar no Meta Ads">
                      @if (activatingId === campaign.id) {
                        <mat-spinner diameter="16" class="btn-spinner"></mat-spinner>
                        <span>Preparando...</span>
                      } @else {
                        <mat-icon>auto_fix_high</mat-icon> Completar Campanha
                      }
                    </button>
                  }
                  @if (campaign.status === 'active') {
                    <button mat-button class="pause-btn" (click)="pauseCampaign(campaign)"
                            matTooltip="Pausar campanha">
                      <mat-icon>pause_circle</mat-icon> Pausar
                    </button>
                  } @else if (campaign.status === 'paused' || campaign.status === 'draft') {
                    <button mat-button class="resume-btn" (click)="resumeCampaign(campaign)"
                            matTooltip="Retomar campanha">
                      <mat-icon>play_circle</mat-icon> Retomar
                    </button>
                  }
                  <button mat-button class="refresh-btn" (click)="refreshMetrics(campaign)"
                          matTooltip="Atualizar metricas">
                    <mat-icon>refresh</mat-icon>
                  </button>
                  <button mat-button class="details-btn" (click)="toggleDetails(campaign)"
                          matTooltip="Ver detalhes da campanha">
                    <mat-icon>{{ expandedCampaignId === campaign.id ? 'expand_less' : 'expand_more' }}</mat-icon>
                    {{ expandedCampaignId === campaign.id ? 'Fechar' : 'Detalhes' }}
                  </button>
                  <button mat-button class="delete-btn" (click)="deleteCampaign(campaign)"
                          matTooltip="Excluir campanha">
                    <mat-icon>delete</mat-icon> Excluir
                  </button>
                </mat-card-actions>
              </mat-card>
            }
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

    h1 {
      font-size: 32px;
      font-weight: 800;
      color: #fafafa;
      margin: 0 0 8px;
      letter-spacing: -1px;
    }

    .page-subtitle {
      font-size: 14px;
      color: #a1a1aa;
      margin: 0 0 28px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .platform-badges {
      display: flex;
      gap: 8px;
      margin: 8px 0;
    }

    .platform-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 10px;
      border-radius: 16px;
      font-size: 12px;
      font-weight: 500;
    }

    .platform-badge.facebook {
      background: #1877f2;
      color: white;
    }

    .platform-badge.instagram {
      background: linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888);
      color: white;
    }

    .platform-badge mat-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
    }

    h2 {
      font-size: 22px;
      font-weight: 700;
      color: #fafafa;
      margin: 36px 0 16px;
      letter-spacing: -0.5px;
    }

    .create-section {
      background: #18181b !important;
      border: 1px solid #27272a !important;
      border-radius: 16px !important;
      color: white;
      margin-bottom: 32px;

      mat-card-title {
        display: flex;
        align-items: center;
        gap: 8px;
        color: #fafafa;
        font-size: 18px;
        font-weight: 600;
      }
    }

    .campaign-stepper {
      background: transparent !important;
    }

    .step-content { padding: 24px 0; }
    .step-hint { color: #a1a1aa; margin-bottom: 16px; font-size: 14px; }
    .step-actions { display: flex; align-items: center; gap: 12px; margin-top: 24px; button { display: flex; align-items: center; gap: 4px; } .btn-spinner { display: inline-block; } }
    .full-width { width: 100%; max-width: 400px; }

    .warning-box {
      background: rgba(245, 158, 11, 0.06);
      border: 1px solid rgba(245, 158, 11, 0.2);
      border-radius: 12px;
      padding: 12px 16px;
      display: flex;
      align-items: center;
      gap: 8px;
      color: #f59e0b;
      font-size: 14px;
      margin: 12px 0;
      mat-icon { color: #f59e0b; }
    }

    .loading-inline { display: flex; align-items: center; gap: 12px; color: #71717a; padding: 20px 0; }

    .creatives-select-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; }

    .creative-select-card {
      background: #09090b;
      border: 2px solid #27272a;
      border-radius: 14px;
      overflow: hidden;
      cursor: pointer;
      transition: all 0.2s;
      position: relative;
      &:hover { border-color: #8b5cf6; }
      &.selected { border-color: #8b5cf6; box-shadow: 0 0 20px rgba(139, 92, 246, 0.15); }
    }

    .creative-select-image { height: 140px; overflow: hidden; background: #09090b; img { width: 100%; height: 100%; object-fit: cover; } }
    .image-placeholder-sm { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; mat-icon { font-size: 40px; width: 40px; height: 40px; opacity: 0.15; color: #71717a; } }
    .creative-select-info { padding: 12px; strong { display: block; font-size: 14px; color: #fafafa; margin-bottom: 6px; line-height: 1.3; } .creative-cta-badge { display: inline-block; font-size: 11px; background: rgba(139, 92, 246, 0.1); color: #a78bfa; padding: 2px 8px; border-radius: 6px; border: 1px solid rgba(139, 92, 246, 0.2); } }
    .selected-check { position: absolute; top: 8px; right: 8px; color: #8b5cf6; background: rgba(0, 0, 0, 0.7); border-radius: 50%; mat-icon { font-size: 28px; width: 28px; height: 28px; } }

    .ai-strategy-box { background: #09090b; border: 1px solid rgba(139, 92, 246, 0.2); border-radius: 14px; padding: 16px; margin-bottom: 20px; }
    .ai-strategy-header { display: flex; align-items: center; gap: 8px; color: #8b5cf6; font-weight: 600; margin-bottom: 12px; font-size: 14px; }
    .ai-strategy-text { color: #a1a1aa; font-size: 13px; line-height: 1.6; white-space: pre-wrap; font-family: inherit; margin: 0; }
    .targeting-summary { background: #09090b; border-radius: 14px; padding: 16px; margin-bottom: 20px; border: 1px solid #27272a; }
    .targeting-item { display: flex; align-items: flex-start; gap: 8px; margin-bottom: 10px; color: #a1a1aa; font-size: 13px; }
    .targeting-label { color: #71717a; min-width: 120px; font-weight: 600; }
    .interests-chips { display: flex; flex-wrap: wrap; gap: 6px; }
    .interest-chip { background: rgba(139, 92, 246, 0.08); color: #a78bfa; padding: 2px 10px; border-radius: 12px; font-size: 12px; border: 1px solid rgba(139, 92, 246, 0.15); }
    .budget-fields { display: flex; gap: 16px; flex-wrap: wrap; mat-form-field { min-width: 200px; } }

    .campaigns-list-section { margin-top: 16px; }
    .loading-state { text-align: center; padding: 40px; color: #71717a; p { margin-top: 12px; } mat-spinner { margin: 0 auto; } }
    .empty-state { text-align: center; padding: 60px 20px; color: #71717a; .empty-icon { font-size: 64px; width: 64px; height: 64px; opacity: 0.2; margin-bottom: 12px; } p { font-size: 16px; margin: 4px 0; } .empty-hint { font-size: 13px; opacity: 0.7; } }
    .campaigns-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)); gap: 20px; }

    .campaign-card {
      background: #18181b !important;
      border-radius: 16px !important;
      color: white;
      position: relative;
      border: 1px solid #27272a !important;
      transition: transform 0.2s, box-shadow 0.2s;
      &:hover { transform: translateY(-2px); box-shadow: 0 8px 32px rgba(0,0,0,0.3); }
    }

    .campaign-title { color: #fafafa !important; font-size: 16px !important; font-weight: 600 !important; }

    .campaign-badges { position: absolute; top: 16px; right: 16px; display: flex; flex-direction: column; align-items: flex-end; gap: 6px; }
    .campaign-status-badge { font-size: 11px; font-weight: 700; padding: 4px 12px; border-radius: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
    .campaign-incomplete-badge { display: flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 8px; background: rgba(245, 158, 11, 0.1); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.2); mat-icon { font-size: 14px; width: 14px; height: 14px; } }
    .status-draft { background: rgba(113, 113, 122, 0.15); color: #a1a1aa; border: 1px solid rgba(113, 113, 122, 0.2); }
    .status-active { background: rgba(34, 197, 94, 0.1); color: #4ade80; border: 1px solid rgba(34, 197, 94, 0.2); }
    .status-paused { background: rgba(245, 158, 11, 0.1); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.2); }
    .status-completed { background: rgba(59, 130, 246, 0.1); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.2); }
    .status-error { background: rgba(239, 68, 68, 0.1); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.2); }
    .status-mock { background: rgba(59, 130, 246, 0.1); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.2); }

    .metrics-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 16px 0; }
    .metric-item { text-align: center; .metric-value { display: block; font-size: 20px; font-weight: 700; color: #fafafa; } .metric-label { display: block; font-size: 11px; color: #71717a; text-transform: uppercase; margin-top: 2px; letter-spacing: 0.5px; } }
    .good-metric { color: #22c55e !important; }
    .bad-metric { color: #ef4444 !important; }

    mat-divider { border-color: #27272a !important; }
    .campaign-budget-info { display: flex; justify-content: space-between; padding: 12px 0 0; color: #71717a; font-size: 13px; strong { color: #a1a1aa; } }
    mat-card-actions { padding: 8px 16px 16px !important; display: flex; align-items: center; gap: 4px; border-top: 1px solid #27272a; }
    .pause-btn { color: #f59e0b !important; }
    .resume-btn { color: #22c55e !important; }
    .refresh-btn { color: #8b5cf6 !important; }
    .delete-btn { color: #ef4444 !important; }
    .meta-link-btn { color: #60a5fa !important; text-decoration: none !important; }
    .activate-btn { color: #22c55e !important; }
    .details-btn { color: #a1a1aa !important; }
    .campaign-details {
      padding: 16px 0 0;
    }

    .detail-section {
      margin-bottom: 16px;
      h4 {
        font-size: 13px;
        font-weight: 600;
        color: #a1a1aa;
        margin: 0 0 10px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        display: flex;
        align-items: center;
        gap: 6px;
      }
    }

    .components-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
    }

    .component-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 10px;
      background: #09090b;
      border-radius: 10px;
      border: 1px solid #27272a;
    }

    .component-label { font-size: 12px; color: #a1a1aa; }
    .component-id { font-size: 10px; color: #52525b; font-family: monospace; word-break: break-all; }

    .component-badge {
      display: inline-block;
      font-size: 11px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 6px;
      width: fit-content;
    }

    .badge-ok { background: rgba(34, 197, 94, 0.1); color: #4ade80; border: 1px solid rgba(34, 197, 94, 0.2); }
    .badge-mock { background: rgba(59, 130, 246, 0.1); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.2); }
    .badge-missing { background: rgba(239, 68, 68, 0.1); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.2); }

    .creative-preview {
      background: #09090b;
      border: 1px solid #27272a;
      border-radius: 12px;
      overflow: hidden;
    }

    .preview-image {
      height: 160px;
      overflow: hidden;
      img { width: 100%; height: 100%; object-fit: cover; }
    }

    .preview-text {
      padding: 12px;
      .preview-headline { display: block; font-size: 14px; color: #fafafa; margin-bottom: 6px; }
      .preview-copy { font-size: 13px; color: #a1a1aa; line-height: 1.5; margin: 0 0 8px; }
      .preview-cta {
        display: inline-block;
        font-size: 11px;
        background: rgba(139, 92, 246, 0.1);
        color: #a78bfa;
        padding: 4px 12px;
        border-radius: 6px;
        border: 1px solid rgba(139, 92, 246, 0.2);
        font-weight: 600;
      }
    }

    .targeting-detail {
      font-size: 13px;
      color: #a1a1aa;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .detail-interests { display: flex; flex-wrap: wrap; gap: 6px; }
    .interest-chip-sm { background: rgba(139, 92, 246, 0.08); color: #a78bfa; padding: 2px 8px; border-radius: 8px; font-size: 11px; border: 1px solid rgba(139, 92, 246, 0.15); }

    .errors-section {
      h4 { color: #f87171 !important; mat-icon { font-size: 18px; width: 18px; height: 18px; } }
    }

    .error-list {
      list-style: none;
      padding: 0;
      margin: 0;
      li {
        font-size: 13px;
        color: #f87171;
        padding: 6px 12px;
        background: rgba(239, 68, 68, 0.05);
        border: 1px solid rgba(239, 68, 68, 0.1);
        border-radius: 8px;
        margin-bottom: 6px;
      }
    }

    ::ng-deep mat-card-subtitle { color: #71717a !important; }

    .page-helper-banner {
      background: linear-gradient(135deg, rgba(59, 130, 246, 0.08), rgba(139, 92, 246, 0.08));
      border: 1px solid rgba(59, 130, 246, 0.25);
      border-radius: 16px;
      padding: 24px;
      margin-bottom: 20px;
      animation: slideDown 0.3s ease-out;
    }

    @keyframes slideDown {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .page-helper-content {
      display: flex;
      gap: 16px;
      margin-bottom: 20px;
    }

    .page-helper-icon {
      flex-shrink: 0;
      width: 48px;
      height: 48px;
      border-radius: 12px;
      background: rgba(59, 130, 246, 0.15);
      display: flex;
      align-items: center;
      justify-content: center;
      mat-icon { font-size: 28px; width: 28px; height: 28px; color: #60a5fa; }
    }

    .page-helper-text {
      h3 { margin: 0 0 8px; color: #fafafa; font-size: 16px; font-weight: 600; }
      p { margin: 0 0 12px; color: #a1a1aa; font-size: 14px; line-height: 1.5; }
    }

    .page-helper-actions {
      display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
      button, a { display: flex; align-items: center; gap: 6px; }
    }

    .reconnect-btn { display: flex; align-items: center; gap: 6px; }
    .retry-btn { color: #a1a1aa !important; display: flex; align-items: center; gap: 6px; }
    .dismiss-btn { color: #71717a !important; }

    .page-helper-secondary {
      margin-top: 16px;
      padding-top: 12px;
      border-top: 1px solid rgba(59, 130, 246, 0.15);
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .secondary-text { color: #71717a; font-size: 13px; }

    .create-page-link {
      color: #60a5fa;
      text-decoration: none;
      font-size: 13px;
      display: flex;
      align-items: center;
      gap: 4px;
      mat-icon { font-size: 14px; width: 14px; height: 14px; }
      &:hover { text-decoration: underline; }
    }

    .campaign-dashboard {
      margin-bottom: 16px;
      h4 {
        display: flex;
        align-items: center;
        gap: 8px;
        color: #fafafa;
        font-size: 16px;
        font-weight: 600;
        margin-bottom: 16px;
        mat-icon { color: #8b5cf6; }
      }
    }

    .dashboard-kpis {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
    }

    .kpi-card {
      background: #09090b;
      border: 1px solid #27272a;
      border-radius: 12px;
      padding: 16px;
      display: flex;
      align-items: center;
      gap: 12px;
      transition: border-color 0.2s;
      &:hover { border-color: #3f3f46; }
    }

    .kpi-icon {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      mat-icon { font-size: 20px; width: 20px; height: 20px; }
    }

    .impressions-icon { background: rgba(59, 130, 246, 0.1); color: #60a5fa; mat-icon { color: #60a5fa; } }
    .clicks-icon { background: rgba(139, 92, 246, 0.1); color: #a78bfa; mat-icon { color: #a78bfa; } }
    .conversions-icon { background: rgba(34, 197, 94, 0.1); color: #4ade80; mat-icon { color: #4ade80; } }
    .leads-icon { background: rgba(236, 72, 153, 0.1); color: #f472b6; mat-icon { color: #f472b6; } }
    .ctr-icon { background: rgba(245, 158, 11, 0.1); color: #fbbf24; mat-icon { color: #fbbf24; } }
    .cpc-icon { background: rgba(20, 184, 166, 0.1); color: #2dd4bf; mat-icon { color: #2dd4bf; } }
    .cpl-icon { background: rgba(168, 85, 247, 0.1); color: #c084fc; mat-icon { color: #c084fc; } }
    .spent-icon { background: rgba(239, 68, 68, 0.1); color: #f87171; mat-icon { color: #f87171; } }

    .kpi-content {
      display: flex;
      flex-direction: column;
      .kpi-value { font-size: 20px; font-weight: 700; color: #fafafa; }
      .kpi-label { font-size: 11px; color: #71717a; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px; }
    }

    .polling-indicator {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 12px;
      padding: 8px 12px;
      background: rgba(34, 197, 94, 0.05);
      border: 1px solid rgba(34, 197, 94, 0.15);
      border-radius: 8px;
      color: #4ade80;
      font-size: 12px;
    }

    .pulse-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #4ade80;
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0% { opacity: 1; box-shadow: 0 0 0 0 rgba(74, 222, 128, 0.4); }
      70% { opacity: 0.7; box-shadow: 0 0 0 6px rgba(74, 222, 128, 0); }
      100% { opacity: 1; box-shadow: 0 0 0 0 rgba(74, 222, 128, 0); }
    }

    @media (max-width: 768px) {
      .dashboard-kpis { grid-template-columns: repeat(2, 1fr); }
    }

    .mode-banner {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 20px;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 20px;
    }

    .mode-banner mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .mode-production {
      background: rgba(34, 197, 94, 0.08);
      border: 1px solid rgba(34, 197, 94, 0.25);
      color: #22c55e;
    }

    .mode-demo {
      background: rgba(245, 158, 11, 0.08);
      border: 1px solid rgba(245, 158, 11, 0.25);
      color: #f59e0b;
    }

    .mode-development {
      background: rgba(239, 68, 68, 0.08);
      border: 1px solid rgba(239, 68, 68, 0.25);
      color: #ef4444;
    }

    .mode-development a {
      color: #ef4444;
      text-decoration: underline;
    }
  `],
})
export class CampaignsComponent implements OnInit, OnDestroy {
  products: Product[] = [];
  approvedCreatives: Creative[] = [];
  campaigns: Campaign[] = [];

  selectedProductId: number | null = null;
  selectedCreativeId: number | null = null;
  noCreativesAvailable = false;

  targetingSuggestion: string = '';
  targetingData: any = null;
  dailyBudget = 0;
  totalBudget = 0;

  loadingCreatives = false;
  loadingCampaigns = false;
  creating = false;
  activatingId: number | null = null;
  showPageHelper: boolean = false;
  pageHelperCampaignId: number | null = null;

  adAccountId = '';
  expandedCampaignId: number | null = null;
  campaignMode: 'production' | 'demo' | 'development' = 'demo';
  private pollingSubscription: Subscription | null = null;

  constructor(
    private campaignService: CampaignService,
    private productService: ProductService,
    private creativeService: CreativeService,
    private snackBar: MatSnackBar,
    private settingsService: SettingsService,
  ) {}

  ngOnInit(): void {
    this.loadProducts();
    this.loadCampaigns();
    this.settingsService.get().subscribe({
      next: (settings) => {
        this.adAccountId = (settings.meta_ad_account_id || '').replace('act_', '');
      },
    });
    // Check campaign mode from prerequisites
    this.settingsService.getPrerequisites().subscribe({
      next: (prereqs) => {
        if (prereqs.meta_connected && prereqs.ad_account) {
          if (prereqs.app_mode === 'development') {
            this.campaignMode = 'development';
          } else {
            this.campaignMode = 'production';
          }
        } else {
          this.campaignMode = 'demo';
        }
      },
      error: () => {
        this.campaignMode = 'demo';
      },
    });
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }

  startPolling(): void {
    this.stopPolling();
    this.pollingSubscription = interval(30000).pipe(
      switchMap(() => this.campaignService.getAll()),
    ).subscribe({
      next: (campaigns) => {
        this.campaigns = campaigns;
      },
      error: () => {} // silently ignore polling errors
    });
  }

  stopPolling(): void {
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
      this.pollingSubscription = null;
    }
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

  loadCampaigns(): void {
    this.loadingCampaigns = true;
    this.campaignService.getAll().subscribe({
      next: (campaigns) => {
        this.campaigns = campaigns;
        this.loadingCampaigns = false;
        this.startPolling();
      },
      error: () => {
        this.campaigns = [];
        this.loadingCampaigns = false;
      },
    });
  }

  onProductSelected(): void {
    if (!this.selectedProductId) return;
    this.selectedCreativeId = null;
    this.noCreativesAvailable = false;
    this.loadingCreatives = true;

    this.creativeService.getAll(this.selectedProductId).subscribe({
      next: (creatives) => {
        this.approvedCreatives = creatives.filter(c => c.status === 'approved');
        this.noCreativesAvailable = this.approvedCreatives.length === 0;
        this.loadingCreatives = false;

        // Pre-compute targeting suggestion based on product data
        const product = this.products.find(p => p.id === this.selectedProductId);
        if (product) {
          this.computeTargetingSuggestion(product);
        }
      },
      error: () => {
        this.approvedCreatives = [];
        this.noCreativesAvailable = true;
        this.loadingCreatives = false;
      },
    });
  }

  selectCreative(creativeId: number): void {
    this.selectedCreativeId = creativeId;
  }

  computeTargetingSuggestion(product: Product): void {
    // Mirror backend logic for display
    const audience = product.target_audience || '';
    let ageMin = 25, ageMax = 55;
    if (audience.includes('18')) ageMin = 18;
    if (audience.includes('25')) ageMin = 25;
    if (audience.includes('35')) ageMin = 35;
    if (audience.includes('45')) ageMax = 45;
    if (audience.includes('55')) ageMax = 55;
    if (audience.includes('65')) ageMax = 65;

    const interestsMap: Record<string, string[]> = {
      'excel': ['Microsoft Office', 'Business software', 'Data analysis', 'Productivity'],
      'marketing': ['Digital marketing', 'Social media marketing', 'Entrepreneurship'],
      'programa': ['Software development', 'Computer programming', 'Technology'],
      'curso': ['Online education', 'E-learning', 'Professional development'],
      'fitness': ['Physical fitness', 'Gym', 'Healthy lifestyle', 'Weight training'],
      'comida': ['Food & restaurants', 'Cooking', 'Gastronomy'],
    };

    const nameLower = product.name.toLowerCase();
    let interests = ['Entrepreneurship', 'Online shopping', 'Small business'];
    for (const [key, vals] of Object.entries(interestsMap)) {
      if (nameLower.includes(key)) {
        interests = vals;
        break;
      }
    }

    const suggestedBudget = Math.max(product.price * 0.1, 20);

    this.targetingData = {
      age_min: ageMin,
      age_max: ageMax,
      interests: interests,
    };

    this.dailyBudget = Math.round(suggestedBudget);
    this.totalBudget = 0;

    this.targetingSuggestion = `Estrategia de Targeting Inteligente:
- Publico: ${audience || 'Geral'}
- Faixa etaria: ${ageMin}-${ageMax} anos
- Interesses: ${interests.join(', ')}
- Posicionamento: Feed do Facebook, Stories do Facebook, Feed do Instagram, Stories do Instagram, Reels do Instagram, Explorar do Instagram
- Otimizacao: Conversoes (compra/cadastro)
- Orcamento sugerido: R$${suggestedBudget.toFixed(2)}/dia
- Lookalike: Ativar apos 100 conversoes iniciais`;
  }

  createCampaign(): void {
    if (!this.selectedProductId) return;
    this.creating = true;

    const data: CampaignCreate = {
      product_id: this.selectedProductId,
      creative_id: this.selectedCreativeId,
      daily_budget: this.dailyBudget,
      total_budget: this.totalBudget,
    };

    this.campaignService.create(data).subscribe({
      next: () => {
        this.creating = false;
        this.showMessage('Campanha criada com sucesso!');
        this.loadCampaigns();
        // Reset form
        this.selectedProductId = null;
        this.selectedCreativeId = null;
        this.targetingSuggestion = '';
        this.targetingData = null;
        this.dailyBudget = 0;
        this.totalBudget = 0;
        this.approvedCreatives = [];
      },
      error: (err) => {
        this.creating = false;
        const msg = err?.error?.detail || 'Erro ao criar campanha';
        this.showMessage(msg, true);
      },
    });
  }

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

  activateCampaign(campaign: Campaign): void {
    // Only warn about budget if campaign isn't already active (it's already spending)
    if (campaign.status !== 'active') {
      if (!confirm(`Ativar campanha "${campaign.name}" no Meta Ads?\n\nATENCAO: Isso vai comecar a gastar seu orcamento de R$${campaign.daily_budget}/dia.`)) return;
    }

    this.activatingId = campaign.id;
    this.campaignService.activate(campaign.id).subscribe({
      next: (result: any) => {
        this.activatingId = null;
        if (result.success) {
          // Show all steps that were executed
          const stepsMsg = result.steps && result.steps.length > 0
            ? result.steps.join(' > ')
            : 'Campanha ativada com sucesso no Meta Ads!';
          this.showMessage(stepsMsg);
          // Update the campaign in the list
          if (result.campaign) {
            const idx = this.campaigns.findIndex(c => c.id === campaign.id);
            if (idx >= 0) this.campaigns[idx] = result.campaign;
          } else {
            this.loadCampaigns();
          }
        } else if (result.error === 'development_mode') {
          this.snackBar.open(
            'Ative o modo Live no Meta Developers para criar anúncios reais.',
            'Abrir Meta Developers',
            { duration: 10000 }
          ).onAction().subscribe(() => {
            window.open('https://developers.facebook.com/apps/', '_blank');
          });
          return;
        } else if (result.error === 'no_page') {
          // Show inline page creation helper instead of just a snackbar
          this.showPageHelper = true;
          this.pageHelperCampaignId = campaign.id;
        } else if (result.error === 'payment_missing') {
          this.showMessage('Adicione um metodo de pagamento em https://www.facebook.com/ads/manager/account_settings/account_billing/', true);
        } else {
          this.showMessage(result.message || 'Erro ao ativar campanha', true);
        }
      },
      error: (err) => {
        this.activatingId = null;
        const msg = err?.error?.detail || err?.error?.message || 'Erro ao ativar campanha';
        this.showMessage(msg, true);
      },
    });
  }

  retryAfterPageCreated(): void {
    this.showPageHelper = false;
    const campaign = this.campaigns.find(c => c.id === this.pageHelperCampaignId);
    if (campaign) {
      this.activateCampaign(campaign);
    }
    this.pageHelperCampaignId = null;
  }

  dismissPageHelper(): void {
    this.showPageHelper = false;
    this.pageHelperCampaignId = null;
  }

  reconnectMeta(): void {
    this.settingsService.reconnectMeta().subscribe({
      next: (result) => {
        if (result.auth_url) {
          window.location.href = result.auth_url;
        } else if (result.error) {
          this.showMessage(result.error, true);
        } else {
          window.location.href = '/settings';
        }
      },
      error: () => {
        window.location.href = '/settings';
      }
    });
  }

  refreshMetrics(campaign: Campaign): void {
    this.campaignService.getById(campaign.id).subscribe({
      next: (updated) => {
        const idx = this.campaigns.findIndex(c => c.id === campaign.id);
        if (idx >= 0) this.campaigns[idx] = updated;
        this.showMessage('Metricas atualizadas');
      },
      error: () => this.showMessage('Erro ao atualizar metricas', true),
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

  isIncomplete(campaign: Campaign): boolean {
    // Show "Incompleta" badge if campaign has real meta_campaign_id but missing adset/creative/ad
    if (!campaign.meta_campaign_id || campaign.meta_campaign_id.startsWith('mock_')) return false;
    return !campaign.meta_adset_id || !campaign.meta_creative_id || !campaign.meta_ad_id;
  }

  getAdsManagerLink(campaign: Campaign): string {
    return `https://www.facebook.com/adsmanager/manage/campaigns?act=${this.adAccountId}&selected_campaign_ids=${campaign.meta_campaign_id}`;
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      draft: 'Rascunho',
      active: 'Ativa',
      paused: 'Pausada',
      completed: 'Concluida',
      error: 'Erro',
      mock: 'Simulado',
    };
    return labels[status] || status;
  }

  toggleDetails(campaign: Campaign): void {
    this.expandedCampaignId = this.expandedCampaignId === campaign.id ? null : campaign.id;
  }

  getComponentStatus(id: string | null | undefined): string {
    if (!id) return 'missing';
    if (id.startsWith('mock_')) return 'mock';
    return 'ok';
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
