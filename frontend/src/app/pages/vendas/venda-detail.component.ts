import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';

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
          Voltar
        </button>
        @if (sale) {
          <h1>Venda #{{ sale.id }}</h1>
        }
      </div>

      @if (loading) {
        <div class="loading-state">
          <mat-icon class="spin">hourglass_empty</mat-icon>
          <p>Carregando...</p>
        </div>
      }

      @if (error) {
        <div class="error-state">
          <mat-icon>error_outline</mat-icon>
          <p>{{ error }}</p>
          <button class="btn-secondary" (click)="goBack()">Voltar para Vendas</button>
        </div>
      }

      @if (!loading && sale) {
        <!-- Top row: Sale info + Campaign info -->
        <div class="info-grid">
          <!-- Sale Card -->
          <div class="info-card">
            <h2><mat-icon>receipt_long</mat-icon> Dados da Venda</h2>
            <div class="info-rows">
              <div class="info-row">
                <span class="info-label">Produto</span>
                <span class="info-value">{{ sale.product_name || 'N/A' }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Plataforma</span>
                <span class="info-value">{{ getPlatformLabel(sale.platform) }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Status</span>
                <span class="info-value status-badge"
                      [class.active]="sale.status === 'completed' || sale.status === 'campaign_active'"
                      [class.pending]="sale.status === 'campaign_pending'"
                      [class.error]="sale.status === 'campaign_error'">
                  {{ getStatusLabel(sale.status) }}
                </span>
              </div>
              <div class="info-row">
                <span class="info-label">Data</span>
                <span class="info-value">{{ sale.created_at | date:'dd/MM/yyyy HH:mm' }}</span>
              </div>
              @if (sale.script) {
                <div class="info-row script-row">
                  <span class="info-label">Roteiro</span>
                  <p class="script-text">{{ sale.script }}</p>
                </div>
              }
            </div>
          </div>

          <!-- Campaign/Ad Card -->
          <div class="info-card">
            <h2><mat-icon>campaign</mat-icon> Anuncio Vinculado</h2>
            @if (sale.campaign) {
              <div class="info-rows">
                <div class="info-row">
                  <span class="info-label">Campanha</span>
                  <span class="info-value">{{ sale.campaign.name }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Status</span>
                  <span class="info-value status-badge"
                        [class.active]="sale.campaign.status === 'active'"
                        [class.pending]="sale.campaign.status === 'draft' || sale.campaign.status === 'pending'"
                        [class.error]="sale.campaign.status === 'error'">
                    {{ getStatusLabel(sale.campaign.status) }}
                  </span>
                </div>
                <div class="info-row">
                  <span class="info-label">Objetivo</span>
                  <span class="info-value">{{ sale.campaign.objective }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Orcamento Diario</span>
                  <span class="info-value">{{ formatCurrency(sale.campaign.daily_budget) }}</span>
                </div>
                @if (sale.campaign.meta_campaign_id) {
                  <div class="info-row">
                    <span class="info-label">Meta Campaign ID</span>
                    <span class="info-value mono">{{ sale.campaign.meta_campaign_id }}</span>
                  </div>
                }
              </div>
            } @else {
              <div class="empty-campaign">
                <mat-icon>link_off</mat-icon>
                <p>Nenhum anuncio vinculado a esta venda</p>
                @if (canRetryCampaign()) {
                  <button class="btn-retry" (click)="retryCampaign()" [disabled]="retryLoading">
                    @if (retryLoading) {
                      <mat-icon class="spin">hourglass_empty</mat-icon>
                      Criando campanha...
                    } @else {
                      <mat-icon>refresh</mat-icon>
                      Tentar Criar Campanha
                    }
                  </button>
                }
                @if (retryError) {
                  <p class="retry-error">{{ retryError }}</p>
                }
              </div>
            }
          </div>
        </div>

        <!-- Metrics Section (only if campaign exists) -->
        @if (sale.campaign) {
          <div class="metrics-section">
            <h2><mat-icon>analytics</mat-icon> Metricas do Anuncio</h2>
            <div class="metrics-grid">
              <div class="metric-card">
                <mat-icon>visibility</mat-icon>
                <span class="metric-value">{{ formatNumber(sale.campaign.impressions) }}</span>
                <span class="metric-label">Impressoes</span>
              </div>
              <div class="metric-card">
                <mat-icon>touch_app</mat-icon>
                <span class="metric-value">{{ formatNumber(sale.campaign.clicks) }}</span>
                <span class="metric-label">Cliques</span>
              </div>
              <div class="metric-card">
                <mat-icon>shopping_cart</mat-icon>
                <span class="metric-value">{{ formatNumber(sale.campaign.conversions) }}</span>
                <span class="metric-label">Conversoes</span>
              </div>
              <div class="metric-card">
                <mat-icon>paid</mat-icon>
                <span class="metric-value">{{ formatCurrency(sale.campaign.spent) }}</span>
                <span class="metric-label">Gasto</span>
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

        <!-- Error message if any -->
        @if (sale.error_message) {
          <div class="error-banner">
            <mat-icon>warning</mat-icon>
            <span>{{ sale.error_message }}</span>
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

      .retry-error {
        color: #ef4444;
        font-size: 13px;
        margin-top: 8px;
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

    .error-banner {
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.25);
      color: #ef4444;
      padding: 12px 16px;
      border-radius: 10px;
      display: flex;
      gap: 8px;
      align-items: center;
      margin-top: 24px;
      font-size: 14px;

      mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
        flex-shrink: 0;
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
  private apiUrl = window.location.hostname === 'localhost'
    ? 'http://localhost:8000/api'
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
        error: () => { this.error = 'Venda nao encontrada'; this.loading = false; },
      });
    }
  }

  canRetryCampaign(): boolean {
    if (!this.sale) return false;
    const eligibleStatus = this.sale.status === 'created' || this.sale.status === 'campaign_error';
    return eligibleStatus && !this.sale.campaign_id;
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
        this.retryError = err.error?.detail || 'Erro ao tentar criar campanha';
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
      'created': 'Criada',
      'campaign_pending': 'Campanha Pendente',
      'campaign_active': 'Campanha Ativa',
      'campaign_error': 'Erro na Campanha',
      'completed': 'Concluida',
      'draft': 'Rascunho',
      'active': 'Ativo',
      'paused': 'Pausado',
      'error': 'Erro',
    };
    return map[status] || status;
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
