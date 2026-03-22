import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="admin-page">
      <!-- Header -->
      <div class="page-header">
        <h1>Painel Administrativo</h1>
        <p class="subtitle">Creditos, limites e uso das plataformas pagas</p>
      </div>

      <!-- Loading -->
      @if (loading) {
        <div class="loading-state">
          <mat-icon class="spin">hourglass_empty</mat-icon>
          <p>Carregando dados...</p>
        </div>
      }

      <!-- Content -->
      @if (!loading && summary) {
        <!-- Summary Cards -->
        <div class="summary-row">
          <div class="summary-card cost-card">
            <div class="summary-icon">
              <mat-icon>trending_down</mat-icon>
            </div>
            <div class="summary-info">
              <span class="summary-label">Custo Plataformas</span>
              <span class="summary-value">US$ {{ formatBrl(summary.total_platform_cost_usd) }}</span>
            </div>
          </div>
          <div class="summary-card revenue-card">
            <div class="summary-icon">
              <mat-icon>trending_up</mat-icon>
            </div>
            <div class="summary-info">
              <span class="summary-label">Receita Total</span>
              <span class="summary-value">US$ {{ formatBrl(summary.total_revenue_usd) }}</span>
            </div>
          </div>
          <div class="summary-card profit-card">
            <div class="summary-icon">
              <mat-icon>account_balance</mat-icon>
            </div>
            <div class="summary-info">
              <span class="summary-label">Lucro</span>
              <span class="summary-value" [class.negative]="summary.profit_usd < 0">US$ {{ formatBrl(summary.profit_usd) }}</span>
            </div>
          </div>
          <div class="summary-card users-card">
            <div class="summary-icon">
              <mat-icon>group</mat-icon>
            </div>
            <div class="summary-info">
              <span class="summary-label">Usuarios Ativos</span>
              <span class="summary-value">{{ summary.total_users }}</span>
            </div>
          </div>
        </div>

        <!-- Platform Cards Grid -->
        <h2 class="section-title">Plataformas</h2>
        <div class="platforms-grid">
          @for (p of platforms; track p.id) {
            <div class="platform-card">
              <!-- Alert Banner -->
              @if (p.alert_level === 'warning') {
                <div class="alert-banner warning">
                  <mat-icon>warning</mat-icon>
                  <span>{{ p.alert_message }}</span>
                </div>
              }
              @if (p.alert_level === 'critical') {
                <div class="alert-banner critical">
                  <mat-icon>error</mat-icon>
                  <span>{{ p.alert_message }}</span>
                </div>
              }

              <div class="platform-header">
                <div class="platform-icon">
                  <mat-icon>{{ p.icon }}</mat-icon>
                </div>
                <div class="platform-title">
                  <h3>{{ p.name }}</h3>
                  <p>{{ p.description }}</p>
                </div>
                <span class="status-badge" [class.configured]="p.configured" [class.not-configured]="!p.configured">
                  @if (p.configured) {
                    <mat-icon>check_circle</mat-icon>
                  }
                  @if (!p.configured) {
                    <mat-icon>cancel</mat-icon>
                  }
                  {{ p.configured ? 'Ativo' : 'Inativo' }}
                </span>
              </div>

              <div class="platform-metrics">
                <!-- Together AI / Veo3 metrics -->
                @if (p.total_spent_usd !== undefined) {
                  <div class="metric">
                    <span class="metric-label">Gasto Total</span>
                    <span class="metric-value">US$ {{ formatBrl(p.total_spent_usd) }}</span>
                  </div>
                  <div class="metric">
                    <span class="metric-label">Requisicoes</span>
                    <span class="metric-value">{{ p.total_requests }}</span>
                  </div>
                  @if (p.cost_per_request_usd !== undefined) {
                    <div class="metric">
                      <span class="metric-label">Custo/Req</span>
                      <span class="metric-value">US$ {{ formatBrl(p.cost_per_request_usd) }}</span>
                    </div>
                  }
                }

                <!-- Stripe metrics -->
                @if (p.total_revenue_usd !== undefined) {
                  <div class="metric">
                    <span class="metric-label">Receita</span>
                    <span class="metric-value">US$ {{ formatBrl(p.total_revenue_usd) }}</span>
                  </div>
                  <div class="metric">
                    <span class="metric-label">Transacoes</span>
                    <span class="metric-value">{{ p.total_transactions }}</span>
                  </div>
                  <div class="metric">
                    <span class="metric-label">Saldo Usuarios</span>
                    <span class="metric-value">US$ {{ formatBrl(p.total_user_balance_usd) }}</span>
                  </div>
                }

                <!-- Meta Ads metrics -->
                @if (p.account_status !== undefined) {
                  <div class="metric">
                    <span class="metric-label">Status</span>
                    <span class="metric-value" [class.connected]="p.account_status === 'connected'">
                      {{ p.account_status === 'connected' ? 'Conectado' : 'Desconectado' }}
                    </span>
                  </div>
                }

                <!-- Veo3 specific -->
                @if (p.videos_generated !== undefined) {
                  <div class="metric">
                    <span class="metric-label">Videos Gerados</span>
                    <span class="metric-value">{{ p.videos_generated }}</span>
                  </div>
                }
              </div>

              <!-- Spend progress bar for platforms with spending -->
              @if (p.total_spent_usd !== undefined && p.total_spent_usd > 0) {
                <div class="spend-bar-container">
                  <div class="spend-bar">
                    <div class="spend-bar-fill" [style.width.%]="getSpendPercent(p)"></div>
                  </div>
                  <span class="spend-bar-label">{{ getSpendPercent(p) | number:'1.0-0' }}% do gasto total</span>
                </div>
              }
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; }

    .admin-page {
      padding: 24px;
      max-width: 1200px;
      margin: 0 auto;
      color: #fafafa;
    }

    .page-header {
      margin-bottom: 32px;
    }

    .page-header h1 {
      font-size: 28px;
      font-weight: 700;
      margin: 0 0 4px;
      color: #fafafa;
    }

    .page-header .subtitle {
      color: #a1a1aa;
      font-size: 14px;
      margin: 0;
    }

    /* Loading */
    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 80px 0;
      color: #a1a1aa;
    }

    .loading-state mat-icon {
      font-size: 40px;
      width: 40px;
      height: 40px;
      margin-bottom: 12px;
    }

    .spin {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      100% { transform: rotate(360deg); }
    }

    /* Summary Row */
    .summary-row {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 32px;
    }

    .summary-card {
      border-radius: 12px;
      padding: 20px;
      border: 1px solid #27272a;
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .cost-card {
      background: linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(239, 68, 68, 0.05));
    }

    .revenue-card {
      background: linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(34, 197, 94, 0.05));
    }

    .profit-card {
      background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(139, 92, 246, 0.05));
    }

    .users-card {
      background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(59, 130, 246, 0.05));
    }

    .summary-icon {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .cost-card .summary-icon {
      background: rgba(239, 68, 68, 0.15);
      color: #ef4444;
    }

    .revenue-card .summary-icon {
      background: rgba(34, 197, 94, 0.15);
      color: #22c55e;
    }

    .profit-card .summary-icon {
      background: rgba(139, 92, 246, 0.15);
      color: #8b5cf6;
    }

    .users-card .summary-icon {
      background: rgba(59, 130, 246, 0.15);
      color: #3b82f6;
    }

    .summary-info {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .summary-label {
      font-size: 12px;
      color: #a1a1aa;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .summary-value {
      font-size: 20px;
      font-weight: 700;
      color: #fafafa;
    }

    .summary-value.negative {
      color: #ef4444;
    }

    /* Section Title */
    .section-title {
      font-size: 20px;
      font-weight: 600;
      margin: 0 0 16px;
      color: #fafafa;
    }

    /* Platforms Grid */
    .platforms-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
    }

    .platform-card {
      background: #18181b;
      border: 1px solid #27272a;
      border-radius: 12px;
      padding: 20px;
      overflow: hidden;
      position: relative;
    }

    /* Alert Banner */
    .alert-banner {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      border-radius: 8px;
      font-size: 13px;
      margin-bottom: 16px;
    }

    .alert-banner.warning {
      background: rgba(245, 158, 11, 0.12);
      color: #f59e0b;
      border: 1px solid rgba(245, 158, 11, 0.25);
    }

    .alert-banner.critical {
      background: rgba(239, 68, 68, 0.12);
      color: #ef4444;
      border: 1px solid rgba(239, 68, 68, 0.25);
    }

    .alert-banner mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    /* Platform Header */
    .platform-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
    }

    .platform-icon {
      width: 44px;
      height: 44px;
      border-radius: 10px;
      background: rgba(139, 92, 246, 0.12);
      color: #8b5cf6;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .platform-icon mat-icon {
      font-size: 24px;
      width: 24px;
      height: 24px;
    }

    .platform-title {
      flex: 1;
      min-width: 0;
    }

    .platform-title h3 {
      font-size: 16px;
      font-weight: 600;
      margin: 0 0 2px;
      color: #fafafa;
    }

    .platform-title p {
      font-size: 12px;
      color: #71717a;
      margin: 0;
    }

    .status-badge {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      font-weight: 500;
      padding: 4px 10px;
      border-radius: 20px;
      flex-shrink: 0;
    }

    .status-badge mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .status-badge.configured {
      background: rgba(34, 197, 94, 0.12);
      color: #22c55e;
      border: 1px solid rgba(34, 197, 94, 0.25);
    }

    .status-badge.not-configured {
      background: rgba(239, 68, 68, 0.12);
      color: #ef4444;
      border: 1px solid rgba(239, 68, 68, 0.25);
    }

    /* Metrics */
    .platform-metrics {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
    }

    .metric {
      flex: 1;
      min-width: 100px;
      background: rgba(255, 255, 255, 0.03);
      border-radius: 8px;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .metric-label {
      font-size: 11px;
      color: #71717a;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .metric-value {
      font-size: 16px;
      font-weight: 600;
      color: #fafafa;
    }

    .metric-value.connected {
      color: #22c55e;
    }

    /* Spend Bar */
    .spend-bar-container {
      margin-top: 16px;
    }

    .spend-bar {
      height: 4px;
      background: #27272a;
      border-radius: 2px;
      overflow: hidden;
    }

    .spend-bar-fill {
      height: 100%;
      background: linear-gradient(90deg, #8b5cf6, #a78bfa);
      border-radius: 2px;
      transition: width 0.5s ease;
    }

    .spend-bar-label {
      font-size: 11px;
      color: #71717a;
      margin-top: 4px;
      display: block;
    }

    /* Responsive */
    @media (max-width: 900px) {
      .summary-row {
        grid-template-columns: repeat(2, 1fr);
      }

      .platforms-grid {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 600px) {
      .admin-page {
        padding: 16px;
      }

      .summary-row {
        grid-template-columns: 1fr;
      }

      .page-header h1 {
        font-size: 22px;
      }
    }
  `]
})
export class AdminComponent implements OnInit {
  loading = true;
  platforms: any[] = [];
  summary: any = null;
  private maxSpend = 0;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    const backendUrl = window.location.hostname === 'localhost' ? 'http://localhost:8000' : '';
    this.http.get<any>(`${backendUrl}/api/admin/platform-status`).subscribe({
      next: (data) => {
        this.platforms = data.platforms;
        this.summary = data.summary;
        this.maxSpend = Math.max(
          ...this.platforms
            .filter((p: any) => p.total_spent_usd !== undefined)
            .map((p: any) => p.total_spent_usd),
          1
        );
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  formatBrl(value: number): string {
    return value.toFixed(2).replace('.', ',');
  }

  getSpendPercent(platform: any): number {
    if (!this.maxSpend || this.maxSpend === 0) return 0;
    return Math.min((platform.total_spent_usd / this.maxSpend) * 100, 100);
  }
}
