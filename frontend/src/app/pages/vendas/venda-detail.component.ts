import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { I18nService } from '../../services/i18n.service';

@Component({
  selector: 'app-venda-detail',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="detail-page">
      <!-- Header -->
      <div class="detail-header">
        <button class="back-btn" (click)="goBack()">
          <mat-icon>arrow_back</mat-icon>
          {{ i18n.t('vendaDetail.back') }}
        </button>
        @if (sale) {
          <h1>{{ i18n.t('vendaDetail.saleTitle') }} #{{ sale.id }}</h1>
        }
      </div>

      @if (loading) {
        <div class="loading-state">
          <mat-icon class="spin">hourglass_empty</mat-icon>
          <p>{{ i18n.t('vendaDetail.loading') }}</p>
        </div>
      }

      @if (error) {
        <div class="error-state">
          <mat-icon>error_outline</mat-icon>
          <p>{{ error }}</p>
          <button class="btn-secondary" (click)="goBack()">{{ i18n.t('vendaDetail.backToSales') }}</button>
        </div>
      }

      @if (!loading && sale) {
        <!-- Top row: Sale info + Campaign info -->
        <div class="info-grid">
          <!-- Sale Card -->
          <div class="info-card">
            <h2><mat-icon>receipt_long</mat-icon> {{ i18n.t('vendaDetail.saleData') }}</h2>
            <div class="info-rows">
              <div class="info-row">
                <span class="info-label">{{ i18n.t('vendaDetail.product') }}</span>
                <span class="info-value">{{ sale.product_name || 'N/A' }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">{{ i18n.t('vendaDetail.platform') }}</span>
                <span class="info-value">{{ getPlatformLabel(sale.platform) }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">{{ i18n.t('vendaDetail.status') }}</span>
                <span class="info-value status-badge"
                      [class.active]="sale.status === 'completed' || sale.status === 'campaign_active'"
                      [class.pending]="sale.status === 'campaign_pending'"
                      [class.error]="sale.status === 'campaign_error'">
                  {{ getStatusLabel(sale.status) }}
                </span>
              </div>
              <div class="info-row">
                <span class="info-label">{{ i18n.t('vendaDetail.date') }}</span>
                <span class="info-value">{{ sale.created_at | date:'dd/MM/yyyy HH:mm' }}</span>
              </div>
              @if (sale.script) {
                <div class="info-row script-row">
                  <span class="info-label">{{ i18n.t('vendaDetail.script') }}</span>
                  <p class="script-text">{{ sale.script }}</p>
                </div>
              }
            </div>
          </div>

          <!-- Campaign/Ad Card -->
          <div class="info-card">
            <h2><mat-icon>campaign</mat-icon> {{ i18n.t('vendaDetail.linkedAd') }}</h2>
            @if (sale.campaign) {
              <div class="info-rows">
                <div class="info-row">
                  <span class="info-label">{{ i18n.t('vendaDetail.campaign') }}</span>
                  <span class="info-value">{{ sale.campaign.name }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">{{ i18n.t('vendaDetail.status') }}</span>
                  <span class="info-value status-badge"
                        [class.active]="sale.campaign.status === 'active'"
                        [class.pending]="sale.campaign.status === 'draft' || sale.campaign.status === 'pending'"
                        [class.error]="sale.campaign.status === 'error'">
                    {{ getStatusLabel(sale.campaign.status) }}
                  </span>
                </div>
                <div class="info-row">
                  <span class="info-label">{{ i18n.t('vendaDetail.objective') }}</span>
                  <span class="info-value">{{ sale.campaign.objective }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">{{ i18n.t('vendaDetail.dailyBudget') }}</span>
                  <span class="info-value">{{ formatCurrency(sale.campaign.daily_budget) }}</span>
                </div>
                @if (sale.campaign.meta_campaign_id) {
                  <div class="info-row">
                    <span class="info-label">{{ i18n.t('vendaDetail.metaCampaignId') }}</span>
                    <span class="info-value mono">{{ sale.campaign.meta_campaign_id }}</span>
                  </div>
                }
              </div>
              @if (canRetryCampaign()) {
                <div class="retry-section">
                  <button class="btn-retry" (click)="retryCampaign()" [disabled]="retryLoading">
                    @if (retryLoading) {
                      <mat-icon class="spin">hourglass_empty</mat-icon>
                      {{ i18n.t('vendaDetail.recreatingCampaign') }}
                    } @else {
                      <mat-icon>refresh</mat-icon>
                      {{ i18n.t('vendaDetail.tryAgain') }}
                    }
                  </button>
                  @if (retryError || sale.error_message) {
                    <div class="error-card">
                      <div class="error-card-header">
                        <mat-icon>warning_amber</mat-icon>
                        <strong>{{ i18n.t('vendaDetail.campaignProblem') }}</strong>
                      </div>
                      <div class="error-card-body">
                        @for (msg of getErrorMessages(); track msg) {
                          <div class="error-item">
                            <mat-icon>chevron_right</mat-icon>
                            <span>{{ msg }}</span>
                          </div>
                        }
                      </div>
                      @if (getErrorTip()) {
                        <div class="error-tip">
                          <mat-icon>lightbulb</mat-icon>
                          <span>{{ getErrorTip() }}</span>
                        </div>
                      }
                    </div>
                  }
                </div>
              }
            } @else {
              <div class="empty-campaign">
                <mat-icon>link_off</mat-icon>
                <p>{{ i18n.t('vendaDetail.noLinkedAd') }}</p>
                @if (canRetryCampaign()) {
                  <button class="btn-retry" (click)="retryCampaign()" [disabled]="retryLoading">
                    @if (retryLoading) {
                      <mat-icon class="spin">hourglass_empty</mat-icon>
                      {{ i18n.t('vendaDetail.creatingCampaign') }}
                    } @else {
                      <mat-icon>refresh</mat-icon>
                      {{ i18n.t('vendaDetail.tryCreateCampaign') }}
                    }
                  </button>
                }
                @if (retryError || sale.error_message) {
                  <div class="error-card">
                    <div class="error-card-header">
                      <mat-icon>warning_amber</mat-icon>
                      <strong>{{ i18n.t('vendaDetail.campaignProblem') }}</strong>
                    </div>
                    <div class="error-card-body">
                      @for (msg of getErrorMessages(); track msg) {
                        <div class="error-item">
                          <mat-icon>chevron_right</mat-icon>
                          <span>{{ msg }}</span>
                        </div>
                      }
                    </div>
                    @if (getErrorTip()) {
                      <div class="error-tip">
                        <mat-icon>lightbulb</mat-icon>
                        <span>{{ getErrorTip() }}</span>
                      </div>
                    }
                  </div>
                }
              </div>
            }
          </div>
        </div>

        <!-- Metrics Section (only if campaign exists) -->
        @if (sale.campaign) {
          <div class="metrics-section">
            <h2><mat-icon>analytics</mat-icon> {{ i18n.t('vendaDetail.adMetrics') }}</h2>
            <div class="metrics-grid">
              <div class="metric-card">
                <mat-icon>visibility</mat-icon>
                <span class="metric-value">{{ formatNumber(sale.campaign.impressions) }}</span>
                <span class="metric-label">{{ i18n.t('vendaDetail.impressions') }}</span>
              </div>
              <div class="metric-card">
                <mat-icon>touch_app</mat-icon>
                <span class="metric-value">{{ formatNumber(sale.campaign.clicks) }}</span>
                <span class="metric-label">{{ i18n.t('vendaDetail.clicks') }}</span>
              </div>
              <div class="metric-card">
                <mat-icon>shopping_cart</mat-icon>
                <span class="metric-value">{{ formatNumber(sale.campaign.conversions) }}</span>
                <span class="metric-label">{{ i18n.t('vendaDetail.conversions') }}</span>
              </div>
              <div class="metric-card">
                <mat-icon>paid</mat-icon>
                <span class="metric-value">{{ formatCurrency(sale.campaign.spent) }}</span>
                <span class="metric-label">{{ i18n.t('vendaDetail.spent') }}</span>
              </div>
              <div class="metric-card">
                <mat-icon>percent</mat-icon>
                <span class="metric-value">{{ formatPercent(sale.campaign.ctr) }}</span>
                <span class="metric-label">CTR</span>
              </div>
              <div class="metric-card">
                <mat-icon>ads_click</mat-icon>
                <span class="metric-value">{{ formatCurrency(sale.campaign.cpc) }}</span>
                <span class="metric-label">CPC</span>
              </div>
              <div class="metric-card">
                <mat-icon>person_add</mat-icon>
                <span class="metric-value">{{ formatCurrency(sale.campaign.cpl) }}</span>
                <span class="metric-label">CPL</span>
              </div>
            </div>
          </div>
        }

      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }

    .detail-page {
      padding: 32px;
      max-width: 1000px;
      margin: 0 auto;
    }

    .detail-header {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 28px;
    }

    .back-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: transparent;
      border: none;
      color: #a1a1aa;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      padding: 6px 10px;
      border-radius: 8px;
      transition: color 0.15s, background 0.15s;

      mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
      }

      &:hover {
        color: #fafafa;
        background: rgba(255, 255, 255, 0.05);
      }
    }

    h1 {
      font-size: 24px;
      font-weight: 700;
      color: #fafafa;
      margin: 0;
    }

    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    .info-card {
      background: #18181b;
      border: 1px solid #27272a;
      border-radius: 12px;
      padding: 20px;

      h2 {
        font-size: 16px;
        font-weight: 600;
        color: #fafafa;
        margin: 0 0 16px;
        display: flex;
        align-items: center;
        gap: 8px;

        mat-icon {
          font-size: 20px;
          width: 20px;
          height: 20px;
          color: #8b5cf6;
        }
      }
    }

    .info-rows {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .info-row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
    }

    .info-label {
      font-size: 13px;
      color: #71717a;
    }

    .info-value {
      font-size: 14px;
      color: #fafafa;
      font-weight: 500;
    }

    .info-value.mono {
      font-family: monospace;
      font-size: 12px;
      color: #a1a1aa;
    }

    .status-badge {
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;

      &.active {
        background: rgba(34, 197, 94, 0.12);
        color: #22c55e;
      }

      &.pending {
        background: rgba(251, 146, 60, 0.12);
        color: #fb923c;
      }

      &.error {
        background: rgba(239, 68, 68, 0.12);
        color: #ef4444;
      }
    }

    .script-row {
      flex-direction: column;
      gap: 6px;
    }

    .script-text {
      font-size: 13px;
      color: #a1a1aa;
      line-height: 1.5;
      white-space: pre-wrap;
      max-height: 120px;
      overflow-y: auto;
      margin: 0;
    }

    .retry-section {
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid #27272a;

      .btn-retry {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        background: #8b5cf6;
        color: #fafafa;
        border: none;
        border-radius: 10px;
        padding: 10px 24px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.15s, opacity 0.15s;

        mat-icon {
          font-size: 18px;
          width: 18px;
          height: 18px;
        }

        &:hover:not(:disabled) {
          background: #7c3aed;
        }

        &:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      }

    }

    .empty-campaign {
      text-align: center;
      padding: 40px;
      color: #71717a;

      mat-icon {
        font-size: 36px;
        width: 36px;
        height: 36px;
        margin-bottom: 10px;
      }

      p {
        margin: 0;
        font-size: 14px;
      }

      .btn-retry {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        margin-top: 16px;
        background: #8b5cf6;
        color: #fafafa;
        border: none;
        border-radius: 10px;
        padding: 10px 24px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.15s, opacity 0.15s;

        mat-icon {
          font-size: 18px;
          width: 18px;
          height: 18px;
        }

        &:hover:not(:disabled) {
          background: #7c3aed;
        }

        &:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      }

    }

    .metrics-section {
      margin-top: 24px;

      h2 {
        font-size: 16px;
        font-weight: 600;
        color: #fafafa;
        margin: 0 0 16px;
        display: flex;
        align-items: center;
        gap: 8px;

        mat-icon {
          font-size: 20px;
          width: 20px;
          height: 20px;
          color: #8b5cf6;
        }
      }
    }

    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
    }

    .metric-card {
      background: #18181b;
      border: 1px solid #27272a;
      border-radius: 12px;
      padding: 16px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;

      mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
        color: #8b5cf6;
      }

      .metric-value {
        font-size: 22px;
        font-weight: 700;
        color: #fafafa;
      }

      .metric-label {
        font-size: 11px;
        color: #71717a;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
    }

    .error-card {
      margin-top: 16px;
      background: rgba(251, 146, 60, 0.08);
      border: 1px solid rgba(251, 146, 60, 0.2);
      border-radius: 12px;
      overflow: hidden;
    }

    .error-card-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 16px;
      background: rgba(251, 146, 60, 0.06);
      border-bottom: 1px solid rgba(251, 146, 60, 0.12);
      color: #fb923c;
      font-size: 14px;

      mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
      }
    }

    .error-card-body {
      padding: 12px 16px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .error-item {
      display: flex;
      align-items: flex-start;
      gap: 6px;
      color: #d4d4d8;
      font-size: 13px;
      line-height: 1.5;

      mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
        color: #fb923c;
        flex-shrink: 0;
        margin-top: 2px;
      }
    }

    .error-tip {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      padding: 10px 16px;
      background: rgba(139, 92, 246, 0.08);
      border-top: 1px solid rgba(139, 92, 246, 0.15);
      color: #a78bfa;
      font-size: 13px;
      line-height: 1.5;

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
        flex-shrink: 0;
        margin-top: 1px;
      }
    }

    .error-state {
      text-align: center;
      padding: 60px 0;
      color: #71717a;

      mat-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        margin-bottom: 12px;
      }

      p {
        margin: 0 0 20px;
        font-size: 16px;
      }
    }

    .btn-secondary {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: #27272a;
      color: #fafafa;
      border: 1px solid #3f3f46;
      border-radius: 10px;
      padding: 10px 24px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s;

      &:hover {
        background: #3f3f46;
      }
    }

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

      p { margin: 0; font-size: 14px; }
    }

    .spin {
      animation: spin 1.5s linear infinite;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    @media (max-width: 768px) {
      .detail-page {
        padding: 20px;
      }

      .info-grid {
        grid-template-columns: 1fr;
      }

      .metrics-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }
  `]
})
export class VendaDetailComponent implements OnInit {
  i18n = inject(I18nService);

  private apiUrl = window.location.hostname === 'localhost'
    ? 'http://localhost:8001/api'
    : '/api';

  sale: any = null;
  loading = true;
  error = '';
  retryLoading = false;
  retryError = '';

  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.http.get<any>(`${this.apiUrl}/sales/${id}/detail`).subscribe({
        next: (data) => { this.sale = data; this.loading = false; },
        error: () => { this.error = this.i18n.t('vendaDetail.saleNotFound'); this.loading = false; },
      });
    }
  }

  canRetryCampaign(): boolean {
    if (!this.sale) return false;
    // Show retry when no campaign exists
    if (!this.sale.campaign_id) {
      return this.sale.status === 'created' || this.sale.status === 'campaign_error';
    }
    // Also show retry when campaign exists but has error status
    if (this.sale.campaign && this.sale.campaign.status === 'error') {
      return true;
    }
    return false;
  }

  retryCampaign(): void {
    if (!this.sale || this.retryLoading) return;
    this.retryLoading = true;
    this.retryError = '';
    this.http.post<any>(`${this.apiUrl}/sales/${this.sale.id}/retry-campaign`, {}).subscribe({
      next: () => {
        this.retryLoading = false;
        // Reload sale detail
        this.http.get<any>(`${this.apiUrl}/sales/${this.sale.id}/detail`).subscribe({
          next: (data) => { this.sale = data; },
        });
      },
      error: (err) => {
        this.retryLoading = false;
        this.retryError = err.error?.detail || this.i18n.t('vendaDetail.errorRetryCampaign');
      },
    });
  }

  goBack(): void {
    this.router.navigate(['/vendas']);
  }

  getPlatformLabel(platform: string): string {
    switch (platform) {
      case 'meta': return 'Meta Ads (Facebook + Instagram)';
      case 'tiktok': return 'TikTok Ads';
      case 'whatsapp': return 'WhatsApp Business';
      default: return platform;
    }
  }

  getStatusLabel(status: string): string {
    const map: Record<string, string> = {
      'created': this.i18n.t('vendaDetail.statusCreated'),
      'campaign_pending': this.i18n.t('vendaDetail.statusCampaignPending'),
      'campaign_active': this.i18n.t('vendaDetail.statusCampaignActive'),
      'campaign_error': this.i18n.t('vendaDetail.statusCampaignError'),
      'completed': this.i18n.t('vendaDetail.statusCompleted'),
      'draft': this.i18n.t('vendaDetail.statusDraft'),
      'active': this.i18n.t('vendaDetail.statusActive'),
      'paused': this.i18n.t('vendaDetail.statusPaused'),
      'error': this.i18n.t('vendaDetail.statusError'),
    };
    return map[status] || status;
  }

  getErrorMessages(): string[] {
    const raw = this.retryError || this.sale?.error_message || '';
    if (!raw) return [];
    return raw.split('; ').map((m: string) => m.trim()).filter((m: string) => m.length > 0);
  }

  getErrorTip(): string {
    const raw = (this.retryError || this.sale?.error_message || '').toLowerCase();
    if (raw.includes('imagem') || raw.includes('image')) {
      return this.i18n.t('vendaDetail.tipImage');
    }
    if (raw.includes('pagamento') || raw.includes('payment') || raw.includes('billing') || raw.includes('forma de pagamento')) {
      return this.i18n.t('vendaDetail.tipPayment');
    }
    if (raw.includes('token') || raw.includes('expirad')) {
      return this.i18n.t('vendaDetail.tipToken');
    }
    if (raw.includes('development') || raw.includes('desenvolvimento')) {
      return this.i18n.t('vendaDetail.tipDevelopment');
    }
    return '';
  }

  formatNumber(n: number): string {
    if (!n) return '0';
    if (n >= 1000000) return (n / 1000000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + 'M';
    if (n >= 1000) return (n / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + 'k';
    return n.toLocaleString('pt-BR');
  }

  formatCurrency(n: number): string {
    if (!n) return 'R$ 0,00';
    return 'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  formatPercent(n: number): string {
    if (!n) return '0,00%';
    return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
  }
}
