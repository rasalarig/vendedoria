import { Component, OnInit, OnDestroy } from '@angular/core';
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
import { MatSliderModule } from '@angular/material/slider';
import { MatDialogModule } from '@angular/material/dialog';
import { MatInputModule } from '@angular/material/input';
import { MatBadgeModule } from '@angular/material/badge';
import { VideoCreativeService, GeneratedVideo, CostEstimate } from '../../services/video-creative.service';
import { ProductService, Product } from '../../services/product.service';
import { SettingsService } from '../../services/settings.service';
import { I18nService } from '../../services/i18n.service';
import { Subscription, interval } from 'rxjs';
import { switchMap } from 'rxjs/operators';

interface VideoProvider {
  id: string;
  name: string;
  icon: string;
  costPerSec: number;
  description: string;
}

interface ProductVideoGroup {
  productId: number;
  productName: string;
  videos: GeneratedVideo[];
}

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
    MatSliderModule,
    MatDialogModule,
    MatInputModule,
    MatBadgeModule,
  ],
  template: `
    <div class="creatives-page">
      <!-- ===================== SECTION 1: Generate New Creative ===================== -->
      <section class="generate-section">
        <h1 class="section-title">
          <mat-icon>videocam</mat-icon>
          {{ i18n.t('creatives.generateNew') }}
        </h1>

        <!-- Product selector -->
        <div class="selectors-row">
          <mat-form-field appearance="outline" class="selector-field">
            <mat-label>{{ i18n.t('creatives.product') }}</mat-label>
            <mat-select [(value)]="selectedProductId">
              @for (product of products; track product.id) {
                <mat-option [value]="product.id">{{ product.name }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
        </div>

        <!-- Provider info (Veo 3) -->
        <div class="provider-section">
          <label class="field-label">{{ i18n.t('creatives.providerLabel') }}</label>
          <div class="provider-cards">
            <div class="provider-card selected">
              <div class="provider-icon-wrap">
                <mat-icon>auto_awesome</mat-icon>
              </div>
              <div class="provider-info">
                <span class="provider-name">Google Veo 3</span>
                <span class="provider-cost">R$ 0.05/seg</span>
              </div>
              <span class="provider-desc">IA generativa de video de ultima geracao</span>
              <div class="provider-check"><mat-icon>check_circle</mat-icon></div>
            </div>
          </div>
        </div>

        <!-- Duration slider + cost -->
        <div class="duration-cost-row">
          <div class="duration-section">
            <label class="field-label">Duracao: {{ selectedDuration }}s</label>
            <div class="slider-container">
              <span class="slider-label">5s</span>
              <mat-slider min="5" max="30" step="1" discrete class="duration-slider">
                <input matSliderThumb [(ngModel)]="selectedDuration" (ngModelChange)="onDurationChange()">
              </mat-slider>
              <span class="slider-label">30s</span>
            </div>
          </div>

          <div class="cost-display">
            <div class="cost-label">{{ i18n.t('creatives.estimatedCost') }}</div>
            <div class="cost-value">R$ {{ estimatedCost | number:'1.2-2' }}</div>
          </div>

          <button mat-flat-button class="generate-video-btn"
                  [disabled]="!canGenerate() || generating"
                  (click)="generateVideo()">
            @if (generating) {
              <mat-spinner diameter="20" class="btn-spinner"></mat-spinner>
              <span>{{ i18n.t('creatives.generating') }}</span>
            } @else {
              <mat-icon>auto_fix_high</mat-icon>
              <span>{{ i18n.t('creatives.generateVideo') }} (R$ {{ estimatedCost | number:'1.2-2' }})</span>
            }
          </button>
        </div>
      </section>

      <!-- ===================== SECTION 2: Generation Status ===================== -->
      @if (generatingVideos.length > 0) {
        <section class="generating-section">
          @for (gv of generatingVideos; track gv.id) {
            <div class="generating-card">
              <div class="generating-spinner">
                <mat-spinner diameter="48" color="accent"></mat-spinner>
              </div>
              <div class="generating-info">
                <h3>{{ i18n.t('creatives.generatingVideo') }}</h3>
                <p>Provedor: <strong>{{ getProviderName(gv.provider) }}</strong></p>
                <p class="generating-hint">Tempo estimado: ~{{ gv.duration * 3 }}s</p>
              </div>
            </div>
          }
        </section>
      }

      <!-- ===================== SECTION 3: Loading ===================== -->
      @if (loading) {
        <div class="loading-state">
          <mat-spinner diameter="48"></mat-spinner>
          <p>{{ i18n.t('creatives.loadingVideos') }}</p>
        </div>
      }

      <!-- ===================== SECTION 4: Empty State ===================== -->
      @if (!loading && generatedVideos.length === 0 && generatingVideos.length === 0) {
        <div class="empty-state">
          <mat-icon class="empty-icon">movie_creation</mat-icon>
          <p>{{ i18n.t('creatives.noVideos') }}</p>
          <p class="empty-hint">{{ i18n.t('creatives.noVideosHint') }}</p>
        </div>
      }

      <!-- ===================== SECTION 5: Version History / Grouped Grid ===================== -->
      @if (!loading && productGroups.length > 0) {
        @for (group of productGroups; track group.productId) {
          <section class="product-group">
            <h2 class="group-title">
              <mat-icon>inventory_2</mat-icon>
              {{ group.productName }}
              <span class="group-count">{{ group.videos.length }} video(s)</span>
            </h2>
            <div class="videos-grid">
              @for (video of group.videos; track video.id) {
                <mat-card class="video-card" [class.video-approved]="video.status === 'approved'"
                          (click)="openPreview(video)">
                  <!-- Thumbnail -->
                  <div class="video-thumbnail">
                    @if (video.thumbnail_url) {
                      <img [src]="video.thumbnail_url" alt="Video thumbnail" loading="lazy">
                    } @else {
                      <div class="thumbnail-placeholder">
                        <mat-icon>play_circle</mat-icon>
                      </div>
                    }
                    <!-- Status badge -->
                    <div class="video-status-badge" [ngClass]="'vstatus-' + video.status">
                      @if (video.status === 'generating') {
                        <mat-spinner diameter="12" class="status-spinner"></mat-spinner>
                        {{ i18n.t('creatives.statusGenerating') }}
                      }
                      @if (video.status === 'ready') {
                        <mat-icon class="status-icon">check</mat-icon>
                        {{ i18n.t('creatives.statusReady') }}
                      }
                      @if (video.status === 'approved') {
                        <mat-icon class="status-icon">verified</mat-icon>
                        {{ i18n.t('creatives.statusApproved') }}
                      }
                      @if (video.status === 'failed') {
                        <mat-icon class="status-icon">error</mat-icon>
                        {{ i18n.t('creatives.statusFailed') }}
                      }
                    </div>
                    <!-- Version badge -->
                    <div class="version-badge">v{{ video.version }}</div>
                  </div>

                  <mat-card-content class="video-card-content">
                    <div class="video-meta-row">
                      <span class="meta-product">{{ video.product_name || 'Produto' }}</span>
                    </div>
                    <div class="video-badges">
                      <span class="badge badge-provider">{{ getProviderName(video.provider) }}</span>
                      <span class="badge badge-cost">R$ {{ video.cost | number:'1.2-2' }}</span>
                      <span class="badge badge-duration">{{ video.duration }}s</span>
                    </div>
                    <div class="video-date">{{ formatDate(video.created_at) }}</div>
                  </mat-card-content>
                </mat-card>
              }
            </div>
          </section>
        }
      }

      <!-- ===================== SECTION 6: Video Preview Modal ===================== -->
      @if (previewVideo) {
        <div class="modal-overlay" (click)="closePreview()">
          <div class="modal-content" (click)="$event.stopPropagation()">
            <button class="modal-close" (click)="closePreview()">
              <mat-icon>close</mat-icon>
            </button>

            <div class="modal-body">
              <!-- Video Player -->
              <div class="modal-video-player">
                @if (previewVideo.video_url) {
                  <video controls [src]="previewVideo.video_url" class="video-element">
                    Seu navegador nao suporta video.
                  </video>
                } @else {
                  <div class="video-placeholder-large">
                    <mat-icon>movie</mat-icon>
                    <span>Preview do video</span>
                    <span class="placeholder-status">{{ i18n.t('campaigns.status') }}: {{ getStatusLabel(previewVideo.status) }}</span>
                  </div>
                }
              </div>

              <!-- Video Info -->
              <div class="modal-info">
                <div class="modal-info-header">
                  <h2>{{ previewVideo.product_name || 'Video Criativo' }}</h2>
                  <div class="modal-status-badge" [ngClass]="'vstatus-' + previewVideo.status">
                    {{ getStatusLabel(previewVideo.status) }}
                  </div>
                </div>

                <div class="modal-meta">
                  <span><mat-icon>timer</mat-icon> {{ previewVideo.duration }}s</span>
                  <span><mat-icon>paid</mat-icon> R$ {{ previewVideo.cost | number:'1.2-2' }}</span>
                  <span><mat-icon>smart_toy</mat-icon> {{ getProviderName(previewVideo.provider) }}</span>
                </div>

                <!-- Script -->
                <div class="modal-script-section">
                  <label class="field-label">
                    Roteiro
                    @if (!editingScript) {
                      <button mat-icon-button class="edit-script-btn" (click)="startEditScript()"
                              matTooltip="Editar roteiro">
                        <mat-icon>edit</mat-icon>
                      </button>
                    }
                  </label>
                  @if (editingScript) {
                    <textarea class="script-editor" [(ngModel)]="editedScript" rows="6"></textarea>
                    <div class="script-edit-actions">
                      <button mat-button class="cancel-edit-btn" (click)="cancelEditScript()">Cancelar</button>
                      <button mat-flat-button class="save-script-btn" (click)="saveScript()">Salvar Roteiro</button>
                    </div>
                  } @else {
                    <div class="script-text">{{ previewVideo.script || 'Roteiro nao disponivel' }}</div>
                  }
                </div>

                <div class="modal-cost-info">
                  Este video custou <strong>R$ {{ previewVideo.cost | number:'1.2-2' }}</strong>
                </div>

                <!-- Actions -->
                <div class="modal-actions">
                  @if (previewVideo.status === 'ready') {
                    <button mat-flat-button class="approve-action-btn" (click)="approveVideo()">
                      <mat-icon>check_circle</mat-icon>
                      Aprovar Video
                    </button>
                  }
                  @if (previewVideo.status === 'ready' || previewVideo.status === 'approved') {
                    <button mat-flat-button class="regenerate-action-btn" (click)="showRegenerateConfirm = true">
                      <mat-icon>refresh</mat-icon>
                      Regenerar
                    </button>
                  }
                </div>

                <!-- Regenerate confirmation -->
                @if (showRegenerateConfirm) {
                  <div class="regenerate-confirm">
                    <p>Regenerar este video ira gerar um novo custo estimado de
                      <strong>R$ {{ estimatedCost | number:'1.2-2' }}</strong>. Deseja continuar?</p>
                    <div class="confirm-actions">
                      <button mat-button (click)="showRegenerateConfirm = false">Cancelar</button>
                      <button mat-flat-button class="confirm-regenerate-btn" (click)="regenerateVideo()">
                        Confirmar Regeneracao
                      </button>
                    </div>
                  </div>
                }
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; padding: 32px; }

    /* ====== Generate Section ====== */
    .generate-section {
      background: #18181b;
      border: 1px solid #27272a;
      border-radius: 16px;
      padding: 28px;
      margin-bottom: 32px;
    }

    .section-title {
      font-size: 28px;
      font-weight: 800;
      color: #fafafa;
      margin: 0 0 24px;
      letter-spacing: -0.5px;
      display: flex;
      align-items: center;
      gap: 12px;
      mat-icon { color: #8b5cf6; font-size: 32px; width: 32px; height: 32px; }
    }

    .selectors-row {
      display: grid;
      grid-template-columns: minmax(0, 400px);
      gap: 16px;
      margin-bottom: 24px;
    }

    .selector-field { width: 100%; margin-bottom: -1.25em; }

    .field-label {
      display: flex; align-items: center; gap: 8px;
      font-size: 13px; font-weight: 600; color: #a1a1aa;
      text-transform: uppercase; letter-spacing: 0.5px;
      margin-bottom: 10px;
    }

    /* Provider cards */
    .provider-section { margin-bottom: 24px; }
    .provider-cards { display: grid; grid-template-columns: 1fr; gap: 12px; max-width: 400px; }
    .provider-card {
      background: #09090b;
      border: 2px solid #27272a;
      border-radius: 12px;
      padding: 16px;
      cursor: pointer;
      transition: all 0.2s;
      position: relative;
      &:hover { border-color: #3f3f46; }
      &.selected { border-color: #8b5cf6; background: rgba(139, 92, 246, 0.05); }
    }
    .provider-icon-wrap {
      width: 40px; height: 40px; border-radius: 10px;
      background: rgba(139, 92, 246, 0.1);
      display: flex; align-items: center; justify-content: center;
      margin-bottom: 10px;
      mat-icon { color: #8b5cf6; }
    }
    .provider-info { display: flex; align-items: baseline; gap: 8px; margin-bottom: 4px; }
    .provider-name { color: #fafafa; font-weight: 600; font-size: 15px; }
    .provider-cost { color: #22c55e; font-size: 13px; font-weight: 500; }
    .provider-desc { color: #71717a; font-size: 12px; }
    .provider-check {
      position: absolute; top: 12px; right: 12px;
      mat-icon { color: #8b5cf6; font-size: 20px; width: 20px; height: 20px; }
    }

    /* Duration + cost row */
    .duration-cost-row {
      display: flex; align-items: center; gap: 24px; flex-wrap: wrap;
    }
    .duration-section { flex: 1; min-width: 240px; }
    .slider-container {
      display: flex; align-items: center; gap: 12px;
    }
    .slider-label { color: #71717a; font-size: 13px; font-weight: 500; }
    .duration-slider { flex: 1; }

    .cost-display {
      background: #09090b; border: 1px solid #27272a; border-radius: 12px;
      padding: 16px 24px; text-align: center;
    }
    .cost-label { color: #71717a; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
    .cost-value { color: #22c55e; font-size: 24px; font-weight: 800; }

    .generate-video-btn {
      background: linear-gradient(135deg, #8b5cf6, #7c3aed) !important;
      color: white !important;
      border-radius: 12px !important;
      padding: 12px 28px !important;
      height: 56px;
      font-size: 15px; font-weight: 600;
      display: flex; align-items: center; gap: 8px;
      white-space: nowrap;
      &:disabled { opacity: 0.5; }
      .btn-spinner { display: inline-block; }
    }

    /* ====== Generating Section ====== */
    .generating-section { margin-bottom: 32px; }
    .generating-card {
      background: #18181b; border: 1px solid rgba(139, 92, 246, 0.3);
      border-radius: 16px; padding: 24px;
      display: flex; align-items: center; gap: 24px;
      animation: pulse-border 2s infinite;
    }
    @keyframes pulse-border {
      0%, 100% { border-color: rgba(139, 92, 246, 0.3); }
      50% { border-color: rgba(139, 92, 246, 0.6); }
    }
    .generating-spinner { flex-shrink: 0; }
    .generating-info {
      h3 { color: #a78bfa; font-size: 18px; margin: 0 0 4px; }
      p { color: #71717a; font-size: 14px; margin: 2px 0; }
      strong { color: #fafafa; }
      .generating-hint { font-size: 12px; opacity: 0.7; }
    }

    /* ====== Loading / Empty ====== */
    .loading-state { text-align: center; padding: 60px 20px; color: #71717a; p { margin-top: 16px; } mat-spinner { margin: 0 auto; } }
    .empty-state {
      text-align: center; padding: 80px 20px; color: #71717a;
      .empty-icon { font-size: 64px; width: 64px; height: 64px; opacity: 0.15; margin-bottom: 16px; }
      p { font-size: 18px; margin: 8px 0; }
      .empty-hint { font-size: 14px; opacity: 0.7; }
    }

    /* ====== Product Groups / Grid ====== */
    .product-group { margin-bottom: 32px; }
    .group-title {
      font-size: 20px; font-weight: 700; color: #fafafa; margin: 0 0 16px;
      display: flex; align-items: center; gap: 10px;
      mat-icon { color: #8b5cf6; font-size: 24px; width: 24px; height: 24px; }
      .group-count { color: #71717a; font-size: 14px; font-weight: 400; margin-left: auto; }
    }

    .videos-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 20px;
    }

    .video-card {
      background: #18181b !important; border: 1px solid #27272a !important;
      border-radius: 16px !important; overflow: hidden; color: white;
      cursor: pointer; transition: all 0.2s;
      &:hover { transform: translateY(-2px); box-shadow: 0 8px 32px rgba(0,0,0,0.3); border-color: #3f3f46 !important; }
      &.video-approved { border-color: rgba(139, 92, 246, 0.4) !important; }
    }

    .video-thumbnail {
      width: 100%; height: 180px; position: relative; overflow: hidden; background: #09090b;
      img { width: 100%; height: 100%; object-fit: cover; }
    }
    .thumbnail-placeholder {
      width: 100%; height: 100%; display: flex; flex-direction: column;
      align-items: center; justify-content: center; gap: 8px;
      background: linear-gradient(135deg, #1a1025 0%, #09090b 100%);
      mat-icon { font-size: 48px; width: 48px; height: 48px; color: #8b5cf6; opacity: 0.3; }
    }

    .video-status-badge {
      position: absolute; top: 10px; right: 10px;
      display: flex; align-items: center; gap: 4px;
      padding: 4px 10px; border-radius: 8px;
      font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.3px;
    }
    .vstatus-generating { background: rgba(245, 158, 11, 0.15); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.3); }
    .vstatus-ready { background: rgba(34, 197, 94, 0.15); color: #4ade80; border: 1px solid rgba(34, 197, 94, 0.3); }
    .vstatus-approved { background: rgba(139, 92, 246, 0.15); color: #a78bfa; border: 1px solid rgba(139, 92, 246, 0.3); }
    .vstatus-failed { background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3); }
    .status-spinner { display: inline-block; }
    .status-icon { font-size: 14px; width: 14px; height: 14px; }

    .version-badge {
      position: absolute; top: 10px; left: 10px;
      background: rgba(9, 9, 11, 0.8); backdrop-filter: blur(8px);
      color: #8b5cf6; font-weight: 700; font-size: 13px;
      padding: 4px 10px; border-radius: 8px;
      border: 1px solid rgba(139, 92, 246, 0.2);
    }

    .video-card-content { padding: 14px 16px 16px !important; }
    .video-meta-row {
      display: flex; align-items: center; gap: 6px;
      font-size: 14px; color: #d4d4d8; margin-bottom: 10px;
    }

    .video-badges { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
    .badge {
      padding: 3px 8px; border-radius: 6px;
      font-size: 11px; font-weight: 600;
    }
    .badge-provider { background: rgba(139, 92, 246, 0.1); color: #a78bfa; border: 1px solid rgba(139, 92, 246, 0.2); }
    .badge-cost { background: rgba(34, 197, 94, 0.1); color: #4ade80; border: 1px solid rgba(34, 197, 94, 0.2); }
    .badge-duration { background: rgba(59, 130, 246, 0.1); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.2); }

    .video-date { font-size: 12px; color: #52525b; }

    /* ====== Modal ====== */
    .modal-overlay {
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0, 0, 0, 0.7); backdrop-filter: blur(4px);
      z-index: 1000; display: flex; align-items: center; justify-content: center;
      padding: 32px;
    }
    .modal-content {
      background: #18181b; border: 1px solid #27272a; border-radius: 20px;
      max-width: 960px; width: 100%; max-height: 90vh; overflow-y: auto;
      position: relative;
    }
    .modal-close {
      position: absolute; top: 16px; right: 16px; z-index: 10;
      background: rgba(9, 9, 11, 0.8); border: 1px solid #27272a;
      border-radius: 10px; color: #a1a1aa; cursor: pointer;
      width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;
      &:hover { color: #fafafa; background: #27272a; }
    }

    .modal-body { padding: 0; }

    .modal-video-player {
      width: 100%; background: #09090b; border-radius: 20px 20px 0 0; overflow: hidden;
    }
    .video-element { width: 100%; display: block; max-height: 400px; }
    .video-placeholder-large {
      width: 100%; height: 320px; display: flex; flex-direction: column;
      align-items: center; justify-content: center; gap: 12px;
      background: linear-gradient(135deg, #1a1025 0%, #09090b 100%);
      mat-icon { font-size: 64px; width: 64px; height: 64px; color: #8b5cf6; opacity: 0.2; }
      span { color: #71717a; font-size: 16px; }
      .placeholder-status { font-size: 13px; color: #52525b; }
    }

    .modal-info { padding: 28px; }
    .modal-info-header {
      display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;
      h2 { font-size: 22px; font-weight: 700; color: #fafafa; margin: 0; }
      .modal-status-badge { padding: 6px 14px; border-radius: 8px; font-size: 12px; font-weight: 700; text-transform: uppercase; }
    }

    .modal-meta {
      display: flex; flex-wrap: wrap; gap: 16px; margin-bottom: 20px;
      span { display: flex; align-items: center; gap: 6px; color: #a1a1aa; font-size: 14px;
        mat-icon { font-size: 18px; width: 18px; height: 18px; color: #8b5cf6; }
      }
    }

    .modal-script-section { margin-bottom: 20px; }
    .script-text {
      background: #09090b; border: 1px solid #27272a; border-radius: 10px;
      padding: 16px; color: #d4d4d8; font-size: 14px; line-height: 1.7;
      white-space: pre-wrap;
    }
    .script-editor {
      width: 100%; background: #09090b; border: 1px solid #8b5cf6;
      border-radius: 10px; padding: 16px; color: #fafafa;
      font-size: 14px; line-height: 1.7; resize: vertical;
      font-family: inherit;
      &:focus { outline: none; border-color: #a78bfa; }
    }
    .script-edit-actions { display: flex; gap: 8px; margin-top: 8px; justify-content: flex-end; }
    .edit-script-btn { color: #8b5cf6 !important; }
    .cancel-edit-btn { color: #71717a !important; }
    .save-script-btn {
      background: #8b5cf6 !important; color: white !important;
      border-radius: 8px !important;
    }

    .modal-cost-info {
      background: rgba(34, 197, 94, 0.05); border: 1px solid rgba(34, 197, 94, 0.2);
      border-radius: 10px; padding: 12px 16px; margin-bottom: 20px;
      color: #a1a1aa; font-size: 14px;
      strong { color: #4ade80; }
    }

    .modal-actions { display: flex; gap: 12px; flex-wrap: wrap; }
    .approve-action-btn {
      background: #22c55e !important; color: white !important;
      border-radius: 10px !important; padding: 10px 24px !important;
      font-weight: 600; display: flex; align-items: center; gap: 8px;
    }
    .regenerate-action-btn {
      background: #f59e0b !important; color: #09090b !important;
      border-radius: 10px !important; padding: 10px 24px !important;
      font-weight: 600; display: flex; align-items: center; gap: 8px;
    }

    .regenerate-confirm {
      background: rgba(245, 158, 11, 0.05); border: 1px solid rgba(245, 158, 11, 0.2);
      border-radius: 10px; padding: 16px; margin-top: 16px;
      p { color: #a1a1aa; font-size: 14px; margin: 0 0 12px; strong { color: #fbbf24; } }
      .confirm-actions { display: flex; gap: 8px; justify-content: flex-end; }
      .confirm-regenerate-btn { background: #f59e0b !important; color: #09090b !important; border-radius: 8px !important; font-weight: 600; }
    }

    /* Responsive */
    @media (max-width: 768px) {
      :host { padding: 16px; }
      .selectors-row { grid-template-columns: 1fr; max-width: 100%; }
      .provider-cards { grid-template-columns: 1fr; }
      .duration-cost-row { flex-direction: column; align-items: stretch; }
      .videos-grid { grid-template-columns: 1fr; }
      .modal-overlay { padding: 16px; }
    }
  `],
})
export class CreativesComponent implements OnInit, OnDestroy {
  // Data
  products: Product[] = [];
  generatedVideos: GeneratedVideo[] = [];
  productGroups: ProductVideoGroup[] = [];

  // Form state
  selectedProductId: number | null = null;
  selectedProvider = 'veo3';
  selectedDuration = 10;
  estimatedCost = 0;

  // Provider (single: Google Veo 3)
  providers: VideoProvider[] = [
    { id: 'veo3', name: 'Google Veo 3', icon: 'auto_awesome', costPerSec: 0.05, description: 'IA generativa de video de ultima geracao' },
  ];

  // UI state
  loading = false;
  generating = false;
  generatingVideos: GeneratedVideo[] = [];
  previewVideo: GeneratedVideo | null = null;
  editingScript = false;
  editedScript = '';
  showRegenerateConfirm = false;

  // Polling
  private pollSubscription: Subscription | null = null;

  constructor(
    private videoCreativeService: VideoCreativeService,
    private productService: ProductService,
    private settingsService: SettingsService,
    private snackBar: MatSnackBar,
    public i18n: I18nService,
  ) {}

  ngOnInit(): void {
    this.loadProducts();
    this.loadGeneratedVideos();
    this.updateCostEstimate();
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }

  // ====== Data Loading ======

  loadProducts(): void {
    this.productService.getAll().subscribe({
      next: (products) => this.products = products,
      error: () => this.products = [],
    });
  }

  loadGeneratedVideos(): void {
    this.loading = true;
    this.videoCreativeService.getGeneratedVideos().subscribe({
      next: (videos) => {
        this.generatedVideos = videos;
        this.generatingVideos = videos.filter(v => v.status === 'generating');
        this.buildProductGroups();
        this.loading = false;
        if (this.generatingVideos.length > 0) {
          this.startPolling();
        }
      },
      error: () => {
        this.generatedVideos = [];
        this.generatingVideos = [];
        this.productGroups = [];
        this.loading = false;
      },
    });
  }

  buildProductGroups(): void {
    const groupMap = new Map<number, ProductVideoGroup>();
    for (const video of this.generatedVideos) {
      const pid = video.product_id;
      if (!groupMap.has(pid)) {
        groupMap.set(pid, {
          productId: pid,
          productName: video.product_name || this.products.find(p => p.id === pid)?.name || 'Produto #' + pid,
          videos: [],
        });
      }
      groupMap.get(pid)!.videos.push(video);
    }
    // Sort videos within each group by version desc
    for (const group of groupMap.values()) {
      group.videos.sort((a, b) => (b.version || 0) - (a.version || 0));
    }
    this.productGroups = Array.from(groupMap.values());
  }

  // ====== Provider & Cost ======

  selectProvider(_providerId: string): void {
    // Single provider (Veo 3), no-op
    this.updateCostEstimate();
  }

  onDurationChange(): void {
    this.updateCostEstimate();
  }

  updateCostEstimate(): void {
    // Try API first, fallback to local calculation
    const localCost = 0.05 * this.selectedDuration;
    this.estimatedCost = localCost;

    this.videoCreativeService.estimateCost('veo3', this.selectedDuration).subscribe({
      next: (estimate) => {
        this.estimatedCost = estimate.estimated_cost;
      },
      error: () => {
        // Keep local estimate
      },
    });
  }

  // ====== Generate ======

  canGenerate(): boolean {
    return this.selectedProductId !== null;
  }

  generateVideo(): void {
    if (!this.canGenerate()) return;
    this.generating = true;

    this.videoCreativeService.generateVideo(
      this.selectedProductId!,
      'veo3',
      this.selectedDuration,
    ).subscribe({
      next: (response) => {
        this.generating = false;
        this.showMessage('Video sendo gerado! Acompanhe o progresso abaixo.');
        this.loadGeneratedVideos();
      },
      error: () => {
        this.generating = false;
        this.showMessage('Erro ao gerar video', true);
      },
    });
  }

  // ====== Polling ======

  startPolling(): void {
    this.stopPolling();
    this.pollSubscription = interval(3000).pipe(
      switchMap(() => this.videoCreativeService.getGeneratedVideos())
    ).subscribe({
      next: (videos) => {
        this.generatedVideos = videos;
        this.generatingVideos = videos.filter(v => v.status === 'generating');
        this.buildProductGroups();
        // Update preview video if open
        if (this.previewVideo) {
          const updated = videos.find(v => v.id === this.previewVideo!.id);
          if (updated) this.previewVideo = updated;
        }
        // Stop polling when nothing generating
        if (this.generatingVideos.length === 0) {
          this.stopPolling();
          this.showMessage('Video(s) pronto(s)!');
        }
      },
    });
  }

  stopPolling(): void {
    if (this.pollSubscription) {
      this.pollSubscription.unsubscribe();
      this.pollSubscription = null;
    }
  }

  // ====== Preview Modal ======

  openPreview(video: GeneratedVideo): void {
    if (video.status === 'generating') return;
    this.previewVideo = { ...video };
    this.editingScript = false;
    this.showRegenerateConfirm = false;
  }

  closePreview(): void {
    this.previewVideo = null;
    this.editingScript = false;
    this.showRegenerateConfirm = false;
  }

  approveVideo(): void {
    if (!this.previewVideo) return;
    this.videoCreativeService.approveVideo(this.previewVideo.id).subscribe({
      next: (updated) => {
        this.previewVideo = updated;
        this.loadGeneratedVideos();
        this.showMessage('Video aprovado com sucesso!');
      },
      error: () => this.showMessage('Erro ao aprovar video', true),
    });
  }

  regenerateVideo(): void {
    if (!this.previewVideo) return;
    this.showRegenerateConfirm = false;
    const script = this.editingScript ? this.editedScript : undefined;
    this.videoCreativeService.regenerateVideo(this.previewVideo.id, script).subscribe({
      next: () => {
        this.closePreview();
        this.showMessage('Regeneracao iniciada!');
        this.loadGeneratedVideos();
      },
      error: () => this.showMessage('Erro ao regenerar video', true),
    });
  }

  // ====== Script Editing ======

  startEditScript(): void {
    this.editingScript = true;
    this.editedScript = this.previewVideo?.script || '';
  }

  cancelEditScript(): void {
    this.editingScript = false;
  }

  saveScript(): void {
    if (this.previewVideo) {
      this.previewVideo = { ...this.previewVideo, script: this.editedScript };
    }
    this.editingScript = false;
    this.showMessage('Roteiro atualizado. Regenere para aplicar.');
  }

  // ====== Helpers ======

  getProviderName(providerId: string): string {
    if (providerId === 'veo3') return 'Google Veo 3';
    return this.providers.find(p => p.id === providerId)?.name || providerId;
  }

  getStatusLabel(status: string): string {
    const keyMap: Record<string, string> = {
      generating: 'creatives.statusGenerating',
      ready: 'creatives.statusReady',
      approved: 'creatives.statusApproved',
      failed: 'creatives.statusFailed',
    };
    return keyMap[status] ? this.i18n.t(keyMap[status]) : status;
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return dateStr;
    }
  }

  private showMessage(message: string, isError = false): void {
    this.snackBar.open(message, 'OK', {
      duration: 3000,
      panelClass: isError ? ['snackbar-error'] : ['snackbar-success'],
    });
  }
}
