import { Component, OnInit, ViewChild, ElementRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { I18nService } from '../../services/i18n.service';

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  image_path: string | null;
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
            <h2>{{ i18n.t('vendaCreate.chooseProduct') }}</h2>
            <p>{{ i18n.t('vendaCreate.chooseProductDesc') }}</p>
          </div>

          @if (loadingProducts) {
            <div class="loading-state">
              <mat-icon class="spin">hourglass_empty</mat-icon>
              <p>{{ i18n.t('vendaCreate.loadingProducts') }}</p>
            </div>
          } @else if (products.length === 0) {
            <div class="empty-state">
              <mat-icon>inventory_2</mat-icon>
              <h3>{{ i18n.t('vendaCreate.noProducts') }}</h3>
              <p>{{ i18n.t('vendaCreate.noProductsDesc') }}</p>
              <button class="btn-primary" (click)="goToProducts()">
                <mat-icon>add</mat-icon>
                {{ i18n.t('vendaCreate.registerProduct') }}
              </button>
            </div>
          } @else {
            <div class="products-grid">
              @for (product of products; track product.id) {
                <div class="product-card"
                     [class.selected]="selectedProduct?.id === product.id"
                     (click)="selectProduct(product)">
                  <div class="product-img">
                    @if (product.image_path) {
                      <img [src]="getProductImageUrl(product)" [alt]="product.name">
                    } @else {
                      <mat-icon>inventory_2</mat-icon>
                    }
                  </div>
                  <div class="product-info">
                    <span class="product-name">{{ product.name }}</span>
                    @if (product.price) {
                      <span class="product-price">R$ {{ formatBrl(product.price) }}</span>
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
            <h2>{{ i18n.t('vendaCreate.whereSell') }}</h2>
            <p>{{ i18n.t('vendaCreate.whereSellDesc') }}</p>
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
                  <span class="badge-soon">{{ i18n.t('common.comingSoon') }}</span>
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
            <h2>{{ i18n.t('vendaCreate.whoActor') }}</h2>
            <p>{{ i18n.t('vendaCreate.whoActorDesc') }}</p>
          </div>

          @if (loadingFaces) {
            <div class="loading-state">
              <mat-icon class="spin">hourglass_empty</mat-icon>
              <p>{{ i18n.t('vendaCreate.loadingFaces') }}</p>
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
                  <span class="face-name">{{ uploading ? i18n.t('vendaCreate.uploading') : i18n.t('vendaCreate.uploadPhoto') }}</span>
                </div>
              } @else {
                <div class="face-card"
                     [class.selected]="selectedFace?.id?.startsWith('custom')"
                     (click)="selectCustomFace()">
                  <div class="face-img-wrap">
                    <img [src]="uploadedFaceUrl" [alt]="i18n.t('vendaCreate.customPhotoAlt')">
                    @if (selectedFace?.id?.startsWith('custom')) {
                      <div class="check-overlay">
                        <mat-icon>check_circle</mat-icon>
                      </div>
                    }
                  </div>
                  <span class="face-name">{{ i18n.t('vendaCreate.custom') }}</span>
                  <button class="change-photo-btn" (click)="triggerUpload(); $event.stopPropagation()">{{ i18n.t('vendaCreate.changePhoto') }}</button>
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

            <!-- Actor style selection -->
            <div class="style-selection-section">
              <h3>{{ i18n.t('vendaCreate.actorStyle') }}</h3>
              <p class="hint">{{ i18n.t('vendaCreate.actorStyleHint') }}</p>
              <div class="styles-grid">
                @for (style of actorStyles; track style.id) {
                  <div class="style-chip"
                       [class.selected]="selectedStyle === style.id"
                       (click)="selectedStyle = style.id">
                    <mat-icon>{{ style.icon }}</mat-icon>
                    <span class="style-label">{{ style.label }}</span>
                    <span class="style-desc">{{ style.desc }}</span>
                  </div>
                }
              </div>
            </div>

            <!-- Additional images section -->
            <div class="additional-images-section">
              <h3>{{ i18n.t('vendaCreate.additionalImages') }}</h3>
              <p class="hint">{{ i18n.t('vendaCreate.additionalImagesHint') }}</p>

              <div class="images-strip">
                @for (img of additionalImages; track img.previewUrl) {
                  <div class="strip-thumb">
                    <img [src]="img.previewUrl" [alt]="i18n.t('vendaCreate.additionalImageAlt')">
                    <button class="remove-btn" (click)="removeAdditionalImage(img)">
                      <mat-icon>close</mat-icon>
                    </button>
                  </div>
                }
                <div class="strip-add" (click)="additionalImageInput.click()">
                  <mat-icon>add_photo_alternate</mat-icon>
                  <span>{{ i18n.t('vendaCreate.add') }}</span>
                </div>
              </div>
              <input #additionalImageInput type="file" multiple accept="image/*"
                     (change)="onAdditionalImagesSelected($event)" style="display:none">
            </div>
          }
        }

        <!-- Step 4: Tipo de Venda -->
        @if (currentStep === 4) {
          <div class="step-header">
            <h2>{{ i18n.t('vendaCreate.saleType') }}</h2>
            <p>{{ i18n.t('vendaCreate.saleTypeDesc') }}</p>
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
                  <span class="badge-soon">{{ i18n.t('common.comingSoon') }}</span>
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

        <!-- Step 5: Roteiro e Video -->
        @if (currentStep === 5) {
          <div class="step-header">
            <h2>{{ i18n.t('vendaCreate.script') }}</h2>
            <p class="step-subtitle">{{ i18n.t('vendaCreate.scriptSubtitle') }}</p>
            <p style="color: #aaa; margin-top: 4px; font-size: 14px;">
              <mat-icon style="font-size: 16px; width: 16px; height: 16px; vertical-align: middle; margin-right: 4px;">timer</mat-icon>
              {{ i18n.t('vendaCreate.videoDuration') }}: <strong style="color: #fff;">{{ i18n.t('vendaCreate.tenSeconds') }}</strong>
            </p>
          </div>

          <!-- Script source toggle -->
          <div style="display: flex; gap: 12px; margin-bottom: 20px;">
            <button (click)="scriptMode = 'manual'"
              [style.background]="scriptMode === 'manual' ? '#7c3aed' : '#2a2a3e'"
              style="flex: 1; padding: 14px; border-radius: 10px; border: 1px solid #444; color: #fff; cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center; gap: 8px;">
              <mat-icon style="font-size: 18px; width: 18px; height: 18px;">edit</mat-icon>
              {{ i18n.t('vendaCreate.writeScript') }}
            </button>
            <button (click)="scriptMode = 'ai'"
              [style.background]="scriptMode === 'ai' ? '#7c3aed' : '#2a2a3e'"
              style="flex: 1; padding: 14px; border-radius: 10px; border: 1px solid #444; color: #fff; cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center; gap: 8px;">
              <mat-icon style="font-size: 18px; width: 18px; height: 18px;">smart_toy</mat-icon>
              {{ i18n.t('vendaCreate.generateWithAI') }}
            </button>
          </div>

          @if (scriptLoading) {
            <div class="loading-state">
              <mat-icon class="spin">hourglass_empty</mat-icon>
              <p>{{ i18n.t('vendaCreate.generatingScript') }}</p>
            </div>
          } @else if (!scriptApproved) {
            <!-- Script editing phase -->
            <div class="script-edit-section">
              @if (scriptMode === 'manual') {
                <p style="color: #aaa; font-size: 13px; margin-bottom: 8px;">{{ i18n.t('vendaCreate.writeScriptHint') }}</p>
                <textarea class="script-textarea" [(ngModel)]="scriptText" rows="6" [placeholder]="i18n.t('vendaCreate.scriptPlaceholder')"></textarea>
              } @else {
                @if (!scriptText.trim()) {
                  <!-- No script yet - show prominent CTA -->
                  <div style="text-align: center; padding: 48px 20px; border: 2px dashed #3f3f46; border-radius: 16px; background: #18181b;">
                    <div style="width: 72px; height: 72px; margin: 0 auto 16px; border-radius: 50%; background: rgba(139, 92, 246, 0.15); display: flex; align-items: center; justify-content: center;">
                      <mat-icon style="font-size: 36px; width: 36px; height: 36px; color: #8b5cf6;">auto_awesome</mat-icon>
                    </div>
                    <h3 style="color: #fafafa; font-size: 20px; font-weight: 700; margin: 0 0 8px;">Gerar Roteiro com IA</h3>
                    <p style="color: #a1a1aa; font-size: 14px; margin: 0 0 24px; max-width: 360px; margin-left: auto; margin-right: auto; line-height: 1.5;">
                      A IA vai criar um roteiro otimizado para vender seu produto em um video de 10 segundos
                    </p>
                    <button class="btn-primary" (click)="generateScript()" style="padding: 16px 32px; font-size: 16px; border-radius: 12px; min-height: 52px;">
                      <mat-icon>smart_toy</mat-icon>
                      Gerar Roteiro com IA
                    </button>
                    <p style="color: #71717a; font-size: 12px; margin-top: 12px;">
                      Custo estimado: ~$0,01 USD
                    </p>
                  </div>
                } @else {
                  <label class="script-label">Roteiro (edite como quiser):</label>
                  <textarea class="script-textarea" [(ngModel)]="scriptText" rows="6"></textarea>
                }
              }

              <!-- Storyboard preview -->
              <div class="storyboard-section">
                <label class="script-label">Imagens do enredo:</label>
                <div class="storyboard-strip">
                  @if (selectedFace) {
                    <div class="storyboard-item main">
                      <img [src]="getFacePreviewUrl()" [alt]="selectedFace.name">
                      <span>Ator/Atriz</span>
                    </div>
                  }
                  @for (img of additionalImages; track img.previewUrl) {
                    <div class="storyboard-item">
                      <img [src]="img.previewUrl" alt="Cena">
                      <span>Cena {{ $index + 1 }}</span>
                    </div>
                  }
                </div>
              </div>

              @if (scriptMode === 'ai' && scriptText.trim()) {
                <!-- Mini-chat for script refinement -->
                <div class="script-chat-section">
                  <h4>Peca alteracoes a IA</h4>
                  <div class="script-chat-messages">
                    @for (msg of scriptChatMessages; track $index) {
                      <div class="chat-msg" [class.user]="msg.role === 'user'" [class.ai]="msg.role === 'ai'">
                        <span class="msg-label">{{ msg.role === 'user' ? 'Voce' : 'IA' }}:</span>
                        <span class="msg-text">{{ msg.text }}</span>
                      </div>
                    }
                    @if (scriptChatLoading) {
                      <div class="chat-msg ai">
                        <span class="msg-label">IA:</span>
                        <span class="msg-text typing">Reescrevendo roteiro...</span>
                      </div>
                    }
                  </div>
                  <div class="script-chat-input-row">
                    <input type="text" [(ngModel)]="scriptChatInput"
                           placeholder="Ex: deixe mais engracado, adicione urgencia, encurte..."
                           (keydown.enter)="sendScriptChat()"
                           [disabled]="scriptChatLoading">
                    <button class="btn-send" (click)="sendScriptChat()" [disabled]="scriptChatLoading || !scriptChatInput.trim()">
                      <mat-icon>send</mat-icon>
                    </button>
                  </div>
                </div>
              }

              <div class="script-actions">
                @if (scriptMode === 'ai' && scriptText.trim()) {
                  <button class="btn-secondary" (click)="generateScript()">
                    <mat-icon>refresh</mat-icon>
                    Gerar Novo Roteiro
                  </button>
                }
                @if (generatedVideoUrl) {
                  <button class="btn-secondary" (click)="approveScript()">
                    <mat-icon>play_arrow</mat-icon>
                    Ver Video Atual
                  </button>
                  <button class="btn-primary" (click)="regenerateVideo()">
                    <mat-icon>movie_creation</mat-icon>
                    Gerar Novo Video com este Roteiro
                  </button>
                } @else {
                  <button class="btn-primary" (click)="approveScript()" [disabled]="!scriptText.trim()">
                    <mat-icon>check</mat-icon>
                    Gerar Video com este Roteiro
                  </button>
                }
              </div>
            </div>
          } @else {
            <!-- Video generation phase -->
            @if (generatingVideo) {
              <div class="loading-state">
                <mat-icon class="spin">hourglass_empty</mat-icon>
                <p>Gerando seu video com Google Veo 3...</p>
                <p class="hint">Isso pode levar ate 6 minutos</p>
              </div>
            } @else if (videoError) {
              <div class="video-error-state">
                <mat-icon>error_outline</mat-icon>
                <p>{{ videoError }}</p>
                <button class="btn-primary" (click)="generateVideo()">
                  <mat-icon>refresh</mat-icon>
                  Tentar Novamente
                </button>
                <button class="btn-secondary" (click)="scriptApproved = false">
                  <mat-icon>edit</mat-icon>
                  Editar Roteiro
                </button>
              </div>
            } @else if (generatedVideoUrl) {
              <div class="video-preview-wrap">
                <video [src]="generatedVideoUrl" controls class="video-preview"></video>
                <div class="video-actions">
                  @if (videoApproved) {
                    <div class="video-approved-badge">
                      <mat-icon>check_circle</mat-icon>
                      Video Aprovado
                    </div>
                  } @else {
                    <button class="btn-primary" (click)="approveVideo()">
                      <mat-icon>thumb_up</mat-icon>
                      Aprovar Video
                    </button>
                  }
                  <button class="btn-secondary" (click)="regenerateVideo()">
                    <mat-icon>refresh</mat-icon>
                    Gerar Novamente
                  </button>
                  <button class="btn-secondary" (click)="scriptApproved = false">
                    <mat-icon>edit</mat-icon>
                    Editar Roteiro
                  </button>
                </div>
              </div>
            }
          }

          <!-- Existing videos section -->
          <div style="margin-top: 24px; padding: 16px; background: #1a1a2e; border-radius: 12px; border: 1px solid #333;">
            <h4 style="margin: 0 0 12px; font-size: 15px; color: #ccc;">Videos deste produto</h4>
            @if (existingVideosLoading) {
              <p style="color: #888;">Carregando...</p>
            } @else if (existingVideos.length === 0) {
              <p style="color: #666; font-size: 13px;">Nenhum video gerado ainda.</p>
            } @else {
              <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                @for (video of existingVideos; track video.id) {
                  <div (click)="selectExistingVideo(video)"
                    [style.border-color]="selectedExistingVideo?.id === video.id ? '#7c3aed' : '#444'"
                    style="width: 140px; border: 2px solid #444; border-radius: 10px; overflow: hidden; cursor: pointer; background: #2a2a3e;">
                    <div style="height: 80px; background: #333; overflow: hidden;">
                      <video [src]="getVideoUrl(video)" muted style="width: 100%; height: 100%; object-fit: cover;" preload="metadata"></video>
                    </div>
                    <div style="padding: 8px; font-size: 11px; color: #aaa;">
                      {{ video.provider === 'custom' ? 'Upload' : 'Veo 3' }}
                      <br>
                      <span style="color: #666;">{{ video.created_at | slice:0:10 }}</span>
                    </div>
                  </div>
                }
              </div>
              @if (selectedExistingVideo) {
                <button (click)="selectExistingVideo(selectedExistingVideo)" style="margin-top: 8px; padding: 8px 16px; border-radius: 8px; border: 1px solid #7c3aed; background: transparent; color: #7c3aed; cursor: pointer; font-size: 13px; display: flex; align-items: center; gap: 6px;">
                  <mat-icon style="font-size: 16px; width: 16px; height: 16px;">close</mat-icon>
                  Desselecionar video e voltar para geracao
                </button>
              }
            }
            <div style="display: flex; gap: 12px; margin-top: 12px;">
              <label style="flex: 1; padding: 10px; border-radius: 8px; border: 1px dashed #555; color: #aaa; cursor: pointer; text-align: center; font-size: 13px; display: flex; align-items: center; justify-content: center; gap: 6px;">
                <mat-icon style="font-size: 16px; width: 16px; height: 16px;">upload</mat-icon>
                Fazer upload de video
                <input type="file" accept="video/*" (change)="uploadVideo($event)" style="display: none;">
              </label>
            </div>
          </div>
        }

        <!-- Step 6: Revisar e Publicar -->
        @if (currentStep === 6) {
          <div class="step-header">
            <h2>Revisar e Publicar</h2>
            <p>Confira tudo antes de lancar sua campanha</p>
          </div>

          <div class="review-grid">
            <div class="review-item">
              <span class="review-label">Produto</span>
              <div class="review-value">
                <mat-icon>inventory_2</mat-icon>
                <span>{{ selectedProduct?.name }}</span>
                @if (selectedProduct?.price) {
                  <span class="review-price">R$ {{ formatBrl(selectedProduct!.price) }}</span>
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
              <span class="review-label">Ator/Atriz</span>
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

            <div class="review-item">
              <span class="review-label">Video</span>
              <div class="review-value">
                <mat-icon>videocam</mat-icon>
                <span>Video aprovado</span>
                <mat-icon style="color: #22c55e; margin-left: auto;">check_circle</mat-icon>
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
                Publicar Campanha
              }
            </button>
          </div>
        }

        <!-- Step 7: Acompanhar -->
        @if (currentStep === 7) {
          <div class="success-state">
            <div class="success-icon-wrap">
              <mat-icon>check_circle</mat-icon>
            </div>
            <h2>Venda criada com sucesso!</h2>
            @if (createdSale) {
              <p>Produto: <strong>{{ createdSale.product_name }}</strong></p>
              <p>Plataforma: <strong>{{ createdSale.platform === 'meta' ? 'Meta Ads (Facebook + Instagram)' : createdSale.platform === 'tiktok' ? 'TikTok Ads' : 'WhatsApp' }}</strong></p>
              @if (createdSale.campaign_id) {
                <div class="campaign-badge campaign-badge--success">
                  <mat-icon>campaign</mat-icon>
                  <span>Campanha criada</span>
                  @if (createdSale.campaign_name) {
                    <span class="campaign-name">{{ createdSale.campaign_name }}</span>
                  }
                </div>
              } @else if (createdSale.status === 'campaign_error') {
                <div class="campaign-badge campaign-badge--error">
                  <mat-icon>error</mat-icon>
                  <span>Erro ao criar campanha</span>
                  @if (createdSale.error_message) {
                    <p class="campaign-error-detail">{{ createdSale.error_message }}</p>
                  }
                </div>
              } @else {
                <div class="campaign-badge campaign-badge--pending">
                  <mat-icon>info</mat-icon>
                  <span>Configuracao Meta pendente</span>
                </div>
              }
            } @else {
              <p>Acompanhe os resultados na tela de Vendas.</p>
            }
            <div class="success-actions">
              <button class="btn-primary" (click)="goToSaleDetail()">
                <mat-icon>visibility</mat-icon>
                Ver Detalhes da Venda
              </button>
              <button class="btn-secondary" (click)="goToVendas()">
                <mat-icon>list</mat-icon>
                Ver Minhas Vendas
              </button>
            </div>
          </div>
        }
      </div>

      <!-- Navigation buttons -->
      @if (currentStep < 7) {
        <div class="wizard-nav">
          @if (currentStep > 1) {
            <button class="btn-back" (click)="prevStep()">
              <mat-icon>arrow_back</mat-icon>
              Voltar
            </button>
          } @else {
            <div></div>
          }

          @if (currentStep < 6) {
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

    @if (costConfirmAction) {
      <div class="cost-modal-overlay">
        <div class="cost-modal-content">
          <h3 style="margin: 0 0 16px; font-size: 18px; display: flex; align-items: center; gap: 8px;">
            Confirmar Uso de Creditos
          </h3>
          @if (costConfirmData) {
            <div style="background: #2a2a3e; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span style="color: #aaa;">Acao:</span>
                <span style="font-weight: 600;">{{ costConfirmAction === 'script' ? 'Gerar Roteiro' : costConfirmAction === 'video' ? 'Gerar Video' : costConfirmAction === 'refine' ? 'Refinar Roteiro' : 'Chat IA' }}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span style="color: #aaa;">Custo estimado:</span>
                <span style="font-weight: 600; color: #f59e0b;">R$ {{ formatBrl(costConfirmData.estimated_cost_brl) }}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span style="color: #aaa;">Seu saldo atual:</span>
                <span style="font-weight: 600;" [style.color]="costConfirmData.sufficient ? '#10b981' : '#ef4444'">R$ {{ formatBrl(costConfirmData.balance_brl) }}</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #aaa;">Saldo apos:</span>
                <span style="font-weight: 600;" [style.color]="costConfirmData.sufficient ? '#10b981' : '#ef4444'">R$ {{ formatBrl(costConfirmData.balance_brl - costConfirmData.estimated_cost_brl) }}</span>
              </div>
            </div>
            @if (!costConfirmData.sufficient) {
              <div style="background: #3b1a1a; border: 1px solid #ef4444; border-radius: 8px; padding: 12px; margin-bottom: 16px; color: #fca5a5; font-size: 14px;">
                Saldo insuficiente! Adicione creditos para continuar.
              </div>
            }
            <div style="display: flex; gap: 12px; justify-content: flex-end;">
              <button (click)="cancelCost()" style="padding: 10px 20px; border-radius: 8px; border: 1px solid #555; background: transparent; color: #ccc; cursor: pointer; font-size: 14px;">
                Cancelar
              </button>
              @if (costConfirmData.sufficient) {
                <button (click)="confirmCost()" style="padding: 10px 20px; border-radius: 8px; border: none; background: #7c3aed; color: #fff; cursor: pointer; font-size: 14px; font-weight: 600;">
                  Confirmar e Prosseguir
                </button>
              } @else {
                <button (click)="cancelCost()" style="padding: 10px 20px; border-radius: 8px; border: none; background: #7c3aed; color: #fff; cursor: pointer; font-size: 14px; font-weight: 600;">
                  Adicionar Creditos
                </button>
              }
            </div>
          } @else {
            <div style="text-align: center; padding: 20px;">
              <div style="color: #aaa;">Calculando custo...</div>
            </div>
          }
        </div>
      </div>
    }
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

    /* Video step */
    .video-generate-prompt {
      text-align: center;
      padding: 60px 0;

      .video-prompt-icon {
        font-size: 64px;
        width: 64px;
        height: 64px;
        color: #3f3f46;
        margin-bottom: 16px;
      }

      p {
        color: #71717a;
        font-size: 15px;
        margin: 0 0 24px;
      }
    }

    .video-preview-wrap {
      max-height: 55vh;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;

      .video-preview {
        max-height: 45vh;
        width: 100%;
        object-fit: contain;
        border-radius: 12px;
        max-width: 640px;
        background: #09090b;
        border: 2px solid #27272a;
      }

      .video-actions {
        display: flex;
        gap: 14px;
        justify-content: center;
        margin-top: 24px;
      }
    }

    .video-approved-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: rgba(34, 197, 94, 0.12);
      color: #22c55e;
      border: 1px solid rgba(34, 197, 94, 0.3);
      border-radius: 10px;
      padding: 10px 24px;
      font-size: 15px;
      font-weight: 700;

      mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
      }
    }

    .video-error-state {
      text-align: center;
      padding: 60px 0;

      mat-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        color: #ef4444;
        margin-bottom: 12px;
      }

      p {
        color: #a1a1aa;
        font-size: 15px;
        margin: 0 0 24px;
      }
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

    .campaign-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 18px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      margin: 12px 0 20px;

      mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
      }

      .campaign-name {
        font-weight: 400;
        opacity: 0.85;
      }
    }

    .campaign-badge--success {
      background: rgba(34, 197, 94, 0.12);
      color: #16a34a;
    }

    .campaign-badge--error {
      background: rgba(239, 68, 68, 0.12);
      color: #dc2626;

      .campaign-error-detail {
        font-size: 12px;
        margin: 6px 0 0;
        opacity: 0.85;
      }
    }

    .campaign-badge--pending {
      background: rgba(234, 179, 8, 0.12);
      color: #b45309;
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

    /* Script editing */
    .script-edit-section { display: flex; flex-direction: column; gap: 16px; }
    .script-label { color: #a1a1aa; font-size: 14px; font-weight: 500; }
    .script-textarea {
      background: #18181b; border: 1px solid #27272a; border-radius: 8px;
      color: #fafafa; padding: 16px; font-size: 15px; line-height: 1.6;
      resize: vertical; min-height: 120px; font-family: inherit;
    }
    .script-textarea:focus { outline: none; border-color: #8b5cf6; }
    .script-actions { display: flex; gap: 12px; justify-content: flex-end; }
    .storyboard-section { margin-top: 8px; }
    .storyboard-strip {
      display: flex; gap: 12px; overflow-x: auto; padding: 8px 0;
    }
    .storyboard-item {
      flex-shrink: 0; text-align: center;
    }
    .storyboard-item img {
      width: 80px; height: 80px; object-fit: cover; border-radius: 8px;
      border: 2px solid #27272a;
    }
    .storyboard-item.main img { border-color: #8b5cf6; }
    .storyboard-item span { display: block; font-size: 11px; color: #71717a; margin-top: 4px; }

    /* Additional images */
    .additional-images-section { margin-top: 24px; padding-top: 24px; border-top: 1px solid #27272a; }
    .additional-images-section h3 { font-size: 16px; color: #e4e4e7; margin: 0 0 4px; }
    .additional-images-section .hint { font-size: 13px; color: #71717a; margin: 0 0 12px; }
    .images-strip { display: flex; gap: 12px; overflow-x: auto; padding: 4px 0; }
    .strip-thumb {
      position: relative; flex-shrink: 0;
    }
    .strip-thumb img {
      width: 80px; height: 80px; object-fit: cover; border-radius: 8px;
      border: 1px solid #27272a;
    }
    .strip-thumb .remove-btn {
      position: absolute; top: -6px; right: -6px; width: 22px; height: 22px;
      border-radius: 50%; background: #ef4444; border: none; color: white;
      display: flex; align-items: center; justify-content: center; cursor: pointer;
    }
    .strip-thumb .remove-btn mat-icon { font-size: 14px; width: 14px; height: 14px; }
    .strip-add {
      width: 80px; height: 80px; border: 2px dashed #27272a; border-radius: 8px;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      cursor: pointer; gap: 4px; flex-shrink: 0;
    }
    .strip-add mat-icon { color: #71717a; }
    .strip-add span { font-size: 11px; color: #71717a; }
    .strip-add:hover { border-color: #8b5cf6; }
    .strip-add:hover mat-icon, .strip-add:hover span { color: #8b5cf6; }

    .step-subtitle { color: #71717a; font-size: 15px; margin: 0; }
    .hint { font-size: 13px; color: #71717a; }

    /* Responsive - tablet */
    @media (max-width: 768px) {
      :host {
        padding: 20px 16px;
      }

      .stepper-label {
        display: none;
      }

      .stepper-circle {
        width: 28px;
        height: 28px;
        font-size: 12px;
      }

      .stepper-line {
        margin-bottom: 0;
        min-width: 16px;
        max-width: 32px;
      }

      .step-header h2 {
        font-size: 22px;
      }

      .step-content {
        min-height: auto;
      }

      .products-grid {
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
      }

      .faces-grid {
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
      }

      .face-img-wrap {
        width: 100px;
        height: 100px;
      }

      .styles-grid {
        grid-template-columns: repeat(2, 1fr);
      }

      .video-preview-wrap .video-preview {
        max-width: 100%;
      }

      .video-preview-wrap .video-actions {
        flex-wrap: wrap;
      }

      .script-actions {
        flex-wrap: wrap;
      }

      .btn-primary, .btn-secondary {
        min-height: 44px;
        justify-content: center;
      }

      .btn-next, .btn-back {
        min-height: 44px;
      }

      .wizard-nav {
        margin-top: 24px;
        padding-top: 16px;
      }

      .review-item {
        padding: 14px 16px;
      }

      .btn-generate {
        width: 100%;
        justify-content: center;
        padding: 14px 24px;
        font-size: 16px;
      }

      .success-actions {
        flex-direction: column;
        align-items: center;
      }

      .success-actions .btn-primary,
      .success-actions .btn-secondary {
        width: 100%;
      }

      .script-textarea {
        width: 100%;
        box-sizing: border-box;
      }

      .script-chat-section {
        padding: 0.75rem;
      }

      .platform-card {
        padding: 16px;
      }

      .sale-type-card {
        padding: 16px;
        gap: 12px;
      }
    }

    /* Responsive - phone */
    @media (max-width: 480px) {
      :host {
        padding: 16px 10px;
      }

      .stepper {
        margin-bottom: 24px;
      }

      .stepper-circle {
        width: 24px;
        height: 24px;
        font-size: 11px;
      }

      .step-check {
        font-size: 14px;
        width: 14px;
        height: 14px;
      }

      .stepper-line {
        min-width: 10px;
        max-width: 20px;
      }

      .step-header h2 {
        font-size: 20px;
      }

      .step-header p {
        font-size: 13px;
      }

      .products-grid {
        grid-template-columns: 1fr 1fr;
        gap: 10px;
      }

      .product-card {
        padding: 10px;
      }

      .product-img {
        height: 100px;
      }

      .faces-grid {
        grid-template-columns: 1fr 1fr;
        gap: 10px;
      }

      .face-card {
        padding: 10px;
      }

      .face-img-wrap {
        width: 80px;
        height: 80px;
      }

      .styles-grid {
        grid-template-columns: repeat(2, 1fr);
        gap: 0.5rem;
      }

      .style-chip {
        padding: 0.5rem;
      }

      .style-chip .style-desc {
        font-size: 0.6rem;
      }

      .video-preview-wrap .video-preview {
        max-height: 35vh;
        max-width: 100%;
      }

      .video-preview-wrap .video-actions {
        flex-direction: column;
        width: 100%;
      }

      .video-preview-wrap .video-actions .btn-primary,
      .video-preview-wrap .video-actions .btn-secondary {
        width: 100%;
      }

      .script-actions {
        flex-direction: column;
      }

      .script-actions .btn-primary,
      .script-actions .btn-secondary {
        width: 100%;
        justify-content: center;
      }

      .btn-next {
        padding: 10px 16px;
        font-size: 14px;
      }

      .btn-back {
        padding: 10px 14px;
        font-size: 13px;
      }

      .btn-generate {
        padding: 12px 20px;
        font-size: 15px;
      }

      .sale-type-icon {
        width: 40px;
        height: 40px;
      }

      .sale-type-label {
        font-size: 16px;
      }

      .sale-type-desc {
        font-size: 13px;
      }

      .loading-state {
        padding: 40px 0;
      }

      .empty-state {
        padding: 40px 0;
      }
    }

    /* Style selection */
    .style-selection-section { margin-top: 2rem; }
    .style-selection-section h3 { color: #e2e8f0; font-size: 1rem; margin-bottom: .25rem; }
    .styles-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: .75rem; margin-top: .75rem; }
    .style-chip {
        display: flex; flex-direction: column; align-items: center; gap: .25rem;
        padding: .75rem; border-radius: 12px; cursor: pointer;
        background: rgba(255,255,255,0.04); border: 2px solid rgba(255,255,255,0.08);
        transition: all .2s;
    }
    .style-chip:hover { background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.15); }
    .style-chip.selected { border-color: #6366f1; background: rgba(99,102,241,0.12); }
    .style-chip mat-icon { font-size: 24px; width: 24px; height: 24px; color: #a5b4fc; }
    .style-chip.selected mat-icon { color: #818cf8; }
    .style-chip .style-label { font-size: .85rem; font-weight: 600; color: #e2e8f0; }
    .style-chip .style-desc { font-size: .7rem; color: #94a3b8; text-align: center; }

    /* Script mini-chat */
    .script-chat-section { margin-top: 1.5rem; padding: 1rem; background: rgba(0,0,0,0.2); border-radius: 12px; border: 1px solid rgba(255,255,255,0.06); }
    .script-chat-section h4 { color: #a5b4fc; font-size: .85rem; margin: 0 0 .75rem 0; }
    .script-chat-messages { max-height: 150px; overflow-y: auto; margin-bottom: .75rem; display: flex; flex-direction: column; gap: .5rem; }
    .chat-msg { font-size: .8rem; padding: .4rem .6rem; border-radius: 8px; }
    .chat-msg.user { background: rgba(99,102,241,0.15); color: #c7d2fe; align-self: flex-end; }
    .chat-msg.ai { background: rgba(255,255,255,0.06); color: #cbd5e1; align-self: flex-start; }
    .chat-msg .msg-label { font-weight: 600; margin-right: .4rem; }
    .typing { animation: blink 1s infinite; }
    @keyframes blink { 50% { opacity: .5; } }
    .script-chat-input-row { display: flex; gap: .5rem; }
    .script-chat-input-row input {
        flex: 1; padding: .6rem .8rem; border-radius: 8px;
        background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
        color: #e2e8f0; font-size: .85rem; outline: none;
    }
    .script-chat-input-row input:focus { border-color: #6366f1; }
    .script-chat-input-row input::placeholder { color: #64748b; }
    .btn-send {
        padding: .5rem .75rem; border-radius: 8px; border: none;
        background: #6366f1; color: white; cursor: pointer;
        display: flex; align-items: center;
    }
    .btn-send:disabled { opacity: .4; cursor: not-allowed; }
    .btn-send:hover:not(:disabled) { background: #4f46e5; }

    /* Cost confirmation modal */
    .cost-modal-overlay {
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.7); z-index: 9999;
      display: flex; align-items: center; justify-content: center;
    }
    .cost-modal-content {
      background: #1e1e2e; border: 1px solid #444; border-radius: 12px;
      padding: 24px 32px; max-width: 420px; width: 90%; color: #fff;
    }
    @media (max-width: 480px) {
      .cost-modal-content {
        max-width: 100%; width: 100%; height: 100vh;
        border-radius: 0; padding: 20px 16px;
        display: flex; flex-direction: column; justify-content: center;
      }
    }
  `],
})
export class VendaCreateComponent implements OnInit {
  i18n = inject(I18nService);
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  private apiUrl = window.location.hostname === 'localhost'
    ? 'http://localhost:8001/api'
    : '/api';

  currentStep = 1;

  steps: WizardStep[] = [
    { number: 1, label: 'Produto' },
    { number: 2, label: 'Plataforma' },
    { number: 3, label: 'Ator/Atriz' },
    { number: 4, label: 'Tipo' },
    { number: 5, label: 'Roteiro' },
    { number: 6, label: 'Revisar' },
    { number: 7, label: 'Lancar' },
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

  // Style selection
  actorStyles = [
    { id: 'informal', label: 'Informal', icon: 'emoji_people', desc: 'Descontraido e proximo' },
    { id: 'formal', label: 'Formal', icon: 'business_center', desc: 'Profissional e serio' },
    { id: 'funny', label: 'Engracado', icon: 'sentiment_very_satisfied', desc: 'Humoristico e leve' },
    { id: 'technical', label: 'Tecnico', icon: 'science', desc: 'Detalhado e especialista' },
    { id: 'motivational', label: 'Motivacional', icon: 'local_fire_department', desc: 'Energico e inspirador' },
    { id: 'young', label: 'Jovem/Descolado', icon: 'skateboarding', desc: 'Moderno e despojado' },
  ];
  selectedStyle: string = 'informal';

  // Script mini-chat
  scriptChatMessages: {role: string, text: string}[] = [];
  scriptChatInput: string = '';
  scriptChatLoading: boolean = false;

  // Step 3 - Additional images
  additionalImages: {file: File, previewUrl: string}[] = [];

  // Step 5 - Script
  scriptMode: 'ai' | 'manual' = 'ai';
  scriptText = '';
  scriptLoading = false;
  scriptApproved = false;

  // Step 5 - Existing videos
  existingVideos: any[] = [];
  existingVideosLoading = false;
  selectedExistingVideo: any = null;

  // Step 5 - Video
  generatingVideo = false;
  generatedVideoUrl: string | null = null;
  videoApproved = false;
  videoError: string | null = null;

  // Cost confirmation
  costConfirmAction: string | null = null;
  costConfirmData: {action: string, estimated_cost_usd: number, estimated_cost_brl: number, balance_usd: number, balance_brl: number, sufficient: boolean, breakdown: string} | null = null;
  costConfirmLoading = false;
  private _pendingCostAction: (() => void) | null = null;

  // Step 6 - Review & Generate
  generating = false;
  createdSale: any = null;

  constructor(
    private http: HttpClient,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.loadProducts();

    const defaultPlatform = this.platforms.find(p => p.available);
    if (defaultPlatform) {
      this.selectedPlatform = defaultPlatform;
    }

    const defaultSaleType = this.saleTypes.find(t => t.available);
    if (defaultSaleType) {
      this.selectedSaleType = defaultSaleType;
    }
  }

  private loadProducts(): void {
    this.loadingProducts = true;
    this.http.get<Product[]>(`${this.apiUrl}/products`).subscribe({
      next: (products) => {
        this.products = products;
        if (this.products.length === 1 && !this.selectedProduct) {
          this.selectProduct(this.products[0]);
        }
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
        if (!this.selectedFace && this.faces.length > 0) {
          const nonCustom = this.faces.find(f => !f.is_custom);
          if (nonCustom) this.selectFace(nonCustom);
        }
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
      case 5: return this.videoApproved;
      default: return false;
    }
  }

  nextStep(): void {
    if (!this.canAdvance()) return;
    this.currentStep++;
    if (this.currentStep === 3) {
      this.loadFaces();
    }
    if (this.currentStep === 5) {
      this.loadExistingVideos();
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

  getProductImageUrl(product: Product): string {
    if (!product.image_path) return '';
    if (product.image_path.startsWith('http')) return product.image_path;
    const backendUrl = window.location.hostname === 'localhost' ? 'http://localhost:8001' : '';
    return backendUrl + product.image_path;
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
          ? 'http://localhost:8001'
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

  // Step 3 - Additional images
  onAdditionalImagesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      for (let i = 0; i < input.files.length; i++) {
        const file = input.files[i];
        const previewUrl = URL.createObjectURL(file);
        this.additionalImages.push({ file, previewUrl });
      }
    }
    input.value = ''; // reset to allow re-selecting same files
  }

  removeAdditionalImage(img: {file: File, previewUrl: string}): void {
    URL.revokeObjectURL(img.previewUrl);
    this.additionalImages = this.additionalImages.filter(i => i !== img);
  }

  // Step 4
  selectSaleType(saleType: SaleType): void {
    this.selectedSaleType = saleType;
  }

  // Cost confirmation
  requestCostConfirm(action: string, onConfirm: () => void, duration: number = 10): void {
    this.costConfirmLoading = true;
    const backendUrl = window.location.hostname === 'localhost' ? 'http://localhost:8001' : '';
    this.http.get<any>(`${backendUrl}/api/credits/estimate`, {
      params: { action, duration: duration.toString() }
    }).subscribe({
      next: (data) => {
        this.costConfirmLoading = false;
        if (!data.sufficient) {
          this.costConfirmData = data;
          this.costConfirmAction = action;
          this._pendingCostAction = null;
        } else {
          this.costConfirmData = data;
          this.costConfirmAction = action;
          this._pendingCostAction = onConfirm;
        }
      },
      error: () => {
        this.costConfirmLoading = false;
        // If estimate fails, proceed anyway (don't block the user)
        onConfirm();
      }
    });
  }

  confirmCost(): void {
    this.costConfirmAction = null;
    this.costConfirmData = null;
    if (this._pendingCostAction) {
      this._pendingCostAction();
      this._pendingCostAction = null;
    }
  }

  cancelCost(): void {
    this.costConfirmAction = null;
    this.costConfirmData = null;
    this._pendingCostAction = null;
  }

  // Step 5 - Script generation
  generateScript(): void {
    this.requestCostConfirm('script', () => this._doGenerateScript());
  }

  private _doGenerateScript(): void {
    this.scriptLoading = true;
    this.scriptApproved = false;
    const backendUrl = window.location.hostname === 'localhost' ? 'http://localhost:8001' : '';
    const faceUrl = this.getFacePreviewUrl();
    this.http.post<any>(`${backendUrl}/api/creatives/script/generate`, {
      product_id: this.selectedProduct!.id,
      face_url: faceUrl || undefined,
      style: this.selectedStyle,
      duration: 10,
    }).subscribe({
      next: (res) => {
        this.scriptLoading = false;
        this.scriptText = res.script;
      },
      error: (err) => {
        this.scriptLoading = false;
        const detail = err?.error?.detail || err?.message || 'Erro desconhecido';
        this.scriptText = 'Erro ao gerar roteiro: ' + detail + '\n\nEscreva seu proprio roteiro abaixo ou clique "Gerar Novo Roteiro" para tentar novamente.';
      },
    });
  }

  regenerateVideo(): void {
    this.requestCostConfirm('video', () => {
      this.generatedVideoUrl = null;
      this.videoApproved = false;
      this.scriptApproved = true;
      this.generateVideo();
    });
  }

  approveScript(): void {
    this.scriptApproved = true;
    if (!this.generatedVideoUrl) {
      this.requestCostConfirm('video', () => this.generateVideo());
    }
  }

  sendScriptChat(): void {
    if (!this.scriptChatInput.trim() || this.scriptChatLoading) return;
    this.requestCostConfirm('refine', () => this._doSendScriptChat());
  }

  private _doSendScriptChat(): void {
    const instruction = this.scriptChatInput.trim();
    this.scriptChatMessages.push({ role: 'user', text: instruction });
    this.scriptChatInput = '';
    this.scriptChatLoading = true;

    const backendUrl = window.location.hostname === 'localhost' ? 'http://localhost:8001' : '';
    this.http.post<any>(`${backendUrl}/api/creatives/script/refine`, {
        product_id: this.selectedProduct!.id,
        current_script: this.scriptText,
        instruction: instruction,
        style: this.selectedStyle,
    }).subscribe({
        next: (res) => {
            this.scriptChatLoading = false;
            this.scriptText = res.script;
            this.scriptChatMessages.push({ role: 'ai', text: 'Roteiro atualizado!' });
        },
        error: (err) => {
            this.scriptChatLoading = false;
            const detail = err?.error?.detail || 'Erro ao refinar roteiro';
            this.scriptChatMessages.push({ role: 'ai', text: 'Erro: ' + detail });
        },
    });
  }

  // Step 5 - Video generation
  generateVideo(): void {
    if (this.generatingVideo) return;
    this.generatingVideo = true;
    this.videoApproved = false;
    this.generatedVideoUrl = null;
    this.videoError = null;

    const backendUrl = window.location.hostname === 'localhost'
      ? 'http://localhost:8001'
      : '';

    const faceUrl = this.getFacePreviewUrl();
    // Convert frontend asset URLs to backend-accessible paths
    let backendFaceUrl = faceUrl;
    if (faceUrl && faceUrl.startsWith('/assets/')) {
      // Face images from catalog - send the path so backend can look it up
      backendFaceUrl = faceUrl;
    } else if (faceUrl && !faceUrl.startsWith('http')) {
      // Relative backend path - prefix with backend URL
      backendFaceUrl = backendUrl + faceUrl;
    }
    this.http.post<any>(`${backendUrl}/api/creatives/generate-video`, {
      product_id: this.selectedProduct!.id,
      duration: 10,
      face_url: backendFaceUrl || undefined,
      script: this.scriptText || undefined,
    }).subscribe({
      next: (response) => {
        this.generatingVideo = false;
        if (response.video_url) {
          // video_url is a path like /uploads/videos/generated/veo3_xxx.mp4
          // Prefix with backend URL if it's a relative path
          if (response.video_url.startsWith('/')) {
            this.generatedVideoUrl = `${backendUrl}${response.video_url}`;
          } else {
            this.generatedVideoUrl = response.video_url;
          }
        } else {
          this.videoError = 'Video gerado mas nenhuma URL retornada. Tente novamente.';
        }
      },
      error: (err) => {
        this.generatingVideo = false;
        let detail = 'Erro desconhecido ao gerar video.';
        if (typeof err?.error?.detail === 'string') {
          detail = err.error.detail;
        } else if (typeof err?.error === 'string') {
          detail = err.error;
        } else if (typeof err?.message === 'string') {
          detail = err.message;
        } else if (err?.status) {
          detail = `Erro HTTP ${err.status} ao gerar video.`;
        }
        if (err?.status === 402) {
          this.videoError = 'Creditos insuficientes! Adicione creditos no topo da pagina para continuar gerando videos.';
        } else {
          this.videoError = detail;
        }
      },
    });
  }

  approveVideo(): void {
    this.videoApproved = true;
  }

  // Step 6 - Review & Publish
  generate(): void {
    if (this.generating) return;
    this.generating = true;

    const backendUrl = window.location.hostname === 'localhost' ? 'http://localhost:8001' : '';

    const payload = {
      product_id: this.selectedProduct?.id,
      video_id: this.selectedExistingVideo?.id || null,
      platform: this.selectedPlatform?.id || 'meta',
      sale_type: this.selectedSaleType?.id || 'campaign',
      face_id: this.selectedFace?.id || null,
      script: this.scriptText || null,
      video_url: this.generatedVideoUrl || null,
    };

    this.http.post<any>(`${backendUrl}/api/sales`, payload).subscribe({
      next: (sale) => {
        this.generating = false;
        this.createdSale = sale;
        this.currentStep = 7;
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
      error: (err) => {
        this.generating = false;
        alert('Erro ao criar venda: ' + (err?.error?.detail || 'Erro desconhecido'));
      }
    });
  }

  // Format number with Brazilian decimal comma
  formatBrl(value: number): string {
    return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // Step 7
  goToVendas(): void {
    this.router.navigate(['/vendas']);
  }

  goToSaleDetail(): void {
    if (this.createdSale?.id) {
      this.router.navigate(['/vendas', this.createdSale.id]);
    } else {
      this.router.navigate(['/vendas']);
    }
  }

  goToCampaigns(): void {
    this.router.navigate(['/vendas']);
  }

  // Step 5 - Existing videos
  loadExistingVideos(): void {
    if (!this.selectedProduct) return;
    this.existingVideosLoading = true;
    const backendUrl = window.location.hostname === 'localhost' ? 'http://localhost:8001' : '';
    this.http.get<any[]>(`${backendUrl}/api/creatives/generated-videos`, {
      params: { product_id: this.selectedProduct.id.toString() }
    }).subscribe({
      next: (videos) => {
        this.existingVideosLoading = false;
        this.existingVideos = videos.filter(v => v.status !== 'failed');
      },
      error: () => {
        this.existingVideosLoading = false;
        this.existingVideos = [];
      }
    });
  }

  uploadVideo(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length || !this.selectedProduct) return;
    const file = input.files[0];
    const formData = new FormData();
    formData.append('file', file);

    const backendUrl = window.location.hostname === 'localhost' ? 'http://localhost:8001' : '';
    this.http.post<any>(`${backendUrl}/api/creatives/upload-video?product_id=${this.selectedProduct.id}`, formData).subscribe({
      next: (video) => {
        this.existingVideos.unshift(video);
        this.selectExistingVideo(video);
      },
      error: () => alert('Erro ao enviar video')
    });
    input.value = '';
  }

  getVideoUrl(video: any): string {
    const backendUrl = window.location.hostname === 'localhost' ? 'http://localhost:8001' : '';
    if (video.filename) {
      const path = video.filename.startsWith('/') ? video.filename : '/uploads/videos/' + (video.provider === 'custom' ? 'custom' : 'generated') + '/' + video.filename;
      return backendUrl + path;
    }
    return '';
  }

  selectExistingVideo(video: any): void {
    // Toggle: clicking selected video deselects it
    if (this.selectedExistingVideo?.id === video.id) {
      this.selectedExistingVideo = null;
      this.generatedVideoUrl = null;
      this.videoApproved = false;
      this.scriptApproved = false;
      return;
    }
    this.selectedExistingVideo = video;
    const backendUrl = window.location.hostname === 'localhost' ? 'http://localhost:8001' : '';
    if (video.filename) {
      const path = video.filename.startsWith('/') ? video.filename : `/uploads/videos/${video.provider === 'custom' ? 'custom' : 'generated'}/${video.filename}`;
      this.generatedVideoUrl = `${backendUrl}${path}`;
    }
    this.videoApproved = false;
    this.scriptApproved = true;
    this.scriptText = video.script || '';
  }
}
