import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { I18nService } from '../../services/i18n.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="admin-page">
      <!-- Header -->
      <div class="page-header">
        <div class="header-left">
          <h1>{{ i18n.t('admin.title') }}</h1>
          <p class="subtitle">{{ i18n.t('admin.subtitle') }}</p>
          @if (exchangeRate) {
            <div class="exchange-rate-banner">
              <mat-icon>currency_exchange</mat-icon>
              <span>{{ i18n.t('admin.exchangeRate') }}: US$ 1 = R$ {{ formatBrl(exchangeRate.usd_brl) }} ({{ i18n.t('admin.source') }}: {{ exchangeRate.source }})</span>
            </div>
          }
        </div>
        <div class="currency-toggle">
          <button class="toggle-btn" [class.active]="currency === 'BRL'" (click)="currency = 'BRL'">R$</button>
          <button class="toggle-btn" [class.active]="currency === 'USD'" (click)="currency = 'USD'">US$</button>
        </div>
      </div>

      <!-- Loading -->
      @if (loading) {
        <div class="loading-state">
          <mat-icon class="spin">hourglass_empty</mat-icon>
          <p>{{ i18n.t('admin.loadingData') }}</p>
        </div>
      }

      <!-- Content -->
      @if (!loading && summary) {
        <!-- Summary Cards - Row 1: Financial -->
        <div class="summary-row three-cols">
          <div class="summary-card cost-card" (click)="openModal('cost')">
            <div class="summary-icon">
              <mat-icon>trending_down</mat-icon>
            </div>
            <div class="summary-info">
              <span class="summary-label">{{ i18n.t('admin.operationalCosts') }}</span>
              <span class="summary-value">{{ formatValue(summary.total_platform_cost_usd, summary.total_platform_cost_brl) }}</span>
              <span class="summary-hint">Together AI + Veo 3</span>
            </div>
          </div>
          <div class="summary-card bonus-card" (click)="openModal('bonus')">
            <div class="summary-icon">
              <mat-icon>card_giftcard</mat-icon>
            </div>
            <div class="summary-info">
              <span class="summary-label">{{ i18n.t('admin.bonusGranted') }}</span>
              <span class="summary-value">{{ formatValue(summary.total_bonus_usd, summary.total_bonus_brl) }}</span>
              <span class="summary-hint">{{ i18n.t('admin.bonusHint') }}</span>
            </div>
          </div>
          <div class="summary-card revenue-card" (click)="openModal('revenue')">
            <div class="summary-icon">
              <mat-icon>trending_up</mat-icon>
            </div>
            <div class="summary-info">
              <span class="summary-label">{{ i18n.t('admin.revenue') }}</span>
              <span class="summary-value">{{ formatValue(summary.total_revenue_usd, summary.total_revenue_brl) }}</span>
              <span class="summary-hint">{{ i18n.t('admin.revenueHint') }}</span>
            </div>
          </div>
        </div>

        <!-- Summary Cards - Row 2 -->
        <div class="summary-row two-cols">
          <div class="summary-card profit-card" (click)="openModal('profit')">
            <div class="summary-icon">
              <mat-icon>account_balance</mat-icon>
            </div>
            <div class="summary-info">
              <span class="summary-label">Lucro</span>
              <span class="summary-value" [class.negative]="(currency === 'USD' ? summary.profit_usd : summary.profit_brl) < 0">{{ formatValue(summary.profit_usd, summary.profit_brl) }}</span>
              <span class="summary-hint">Receita - Custos - Bonus</span>
            </div>
          </div>
          <div class="summary-card users-card" (click)="openModal('users')">
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

              @if (p.role_description) {
                <p class="platform-role-desc">{{ p.role_description }}</p>
              }

              <div class="platform-metrics">
                <!-- Together AI / Veo3 metrics -->
                @if (p.total_spent_usd !== undefined) {
                  <div class="metric">
                    <span class="metric-label">Gasto Total</span>
                    <span class="metric-value">{{ formatValue(p.total_spent_usd, p.total_spent_brl) }}</span>
                  </div>
                  <div class="metric">
                    <span class="metric-label">Requisicoes</span>
                    <span class="metric-value">{{ p.total_requests }}</span>
                  </div>
                  @if (p.cost_per_request_usd !== undefined) {
                    <div class="metric">
                      <span class="metric-label">Custo/Req</span>
                      <span class="metric-value">{{ formatValue(p.cost_per_request_usd, p.cost_per_request_brl) }}</span>
                    </div>
                  }
                }

                <!-- Stripe metrics -->
                @if (p.total_revenue_usd !== undefined) {
                  <div class="metric">
                    <span class="metric-label">Receita</span>
                    <span class="metric-value">{{ formatValue(p.total_revenue_usd, p.total_revenue_brl) }}</span>
                  </div>
                  <div class="metric">
                    <span class="metric-label">Transacoes</span>
                    <span class="metric-value">{{ p.total_transactions }}</span>
                  </div>
                  <div class="metric">
                    <span class="metric-label">Saldo Usuarios</span>
                    <span class="metric-value">{{ formatValue(p.total_user_balance_usd, p.total_user_balance_brl) }}</span>
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

      <!-- Modal Overlay -->
      @if (activeModal) {
        <div class="modal-overlay" (click)="closeModal()">
          <div class="modal-content" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2>{{ modalTitle }}</h2>
              <button class="modal-close" (click)="closeModal()">
                <mat-icon>close</mat-icon>
              </button>
            </div>
            <div class="modal-body">

              <!-- Users Modal -->
              @if (activeModal === 'users') {
                @if (modalLoading) {
                  <p class="modal-loading">Carregando...</p>
                } @else {
                  <p class="modal-subtitle">{{ usersData?.total }} usuarios cadastrados</p>
                  <table class="data-table">
                    <thead>
                      <tr>
                        <th>Nome</th>
                        <th>Email</th>
                        <th>Saldo</th>
                        <th>Cadastro</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (u of usersData?.users; track u.id) {
                        <tr>
                          <td>{{ u.name || 'Sem nome' }}</td>
                          <td>{{ u.email }}</td>
                          <td>{{ formatValue(u.credit_balance_usd, u.credit_balance_usd * modalExchangeRate) }}</td>
                          <td>{{ formatDate(u.created_at) }}</td>
                        </tr>
                      }
                    </tbody>
                  </table>
                }
              }

              <!-- Cost Breakdown Modal -->
              @if (activeModal === 'cost') {
                @if (modalLoading) {
                  <p class="modal-loading">Carregando...</p>
                } @else {
                  <p class="modal-subtitle">Detalhamento dos custos operacionais (APIs)</p>
                  <div class="breakdown-section">
                    <div class="breakdown-item">
                      <div class="breakdown-header">
                        <mat-icon>psychology</mat-icon>
                        <span class="breakdown-name">{{ breakdownData?.cost_breakdown?.together_ai?.name }}</span>
                        <span class="breakdown-value">{{ formatValue(breakdownData?.cost_breakdown?.together_ai?.cost_usd, breakdownData?.cost_breakdown?.together_ai?.cost_brl) }}</span>
                      </div>
                      <p class="breakdown-detail">{{ breakdownData?.cost_breakdown?.together_ai?.detail }}</p>
                    </div>
                    <div class="breakdown-item">
                      <div class="breakdown-header">
                        <mat-icon>movie_creation</mat-icon>
                        <span class="breakdown-name">{{ breakdownData?.cost_breakdown?.veo3?.name }}</span>
                        <span class="breakdown-value">{{ formatValue(breakdownData?.cost_breakdown?.veo3?.cost_usd, breakdownData?.cost_breakdown?.veo3?.cost_brl) }}</span>
                      </div>
                      <p class="breakdown-detail">{{ breakdownData?.cost_breakdown?.veo3?.detail }}</p>
                    </div>
                    <div class="breakdown-total">
                      <span>Total Custos Operacionais</span>
                      <span>{{ formatValue(breakdownData?.profit?.platform_cost_usd, breakdownData?.profit?.platform_cost_brl) }}</span>
                    </div>
                  </div>
                }
              }

              <!-- Bonus Modal -->
              @if (activeModal === 'bonus') {
                @if (modalLoading) {
                  <p class="modal-loading">Carregando...</p>
                } @else {
                  <p class="modal-subtitle">Creditos concedidos gratuitamente aos usuarios (investimento da plataforma)</p>
                  <div class="breakdown-total" style="margin-bottom: 16px;">
                    <span>Total Investido</span>
                    <span>{{ formatValue(breakdownData?.cost_breakdown?.bonus?.total_usd, breakdownData?.cost_breakdown?.bonus?.total_brl) }}</span>
                  </div>
                  <p class="modal-subtitle">{{ breakdownData?.cost_breakdown?.bonus?.total_grants }} concessoes</p>
                  @if (breakdownData?.cost_breakdown?.bonus?.recent?.length > 0) {
                    <table class="data-table">
                      <thead>
                        <tr>
                          <th>Data</th>
                          <th>Valor</th>
                        </tr>
                      </thead>
                      <tbody>
                        @for (b of breakdownData?.cost_breakdown?.bonus?.recent; track b.id) {
                          <tr>
                            <td>{{ formatDate(b.created_at) }}</td>
                            <td>{{ formatValue(b.amount_usd, b.amount_brl) }}</td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  } @else {
                    <p class="modal-empty">Nenhum bonus concedido</p>
                  }
                }
              }

              <!-- Revenue Modal -->
              @if (activeModal === 'revenue') {
                @if (modalLoading) {
                  <p class="modal-loading">Carregando...</p>
                } @else {
                  <p class="modal-subtitle">{{ breakdownData?.revenue?.total_transactions }} transacoes de compra</p>
                  <div class="breakdown-total" style="margin-bottom: 16px;">
                    <span>Receita Total</span>
                    <span>{{ formatValue(breakdownData?.revenue?.total_usd, breakdownData?.revenue?.total_brl) }}</span>
                  </div>
                  @if (breakdownData?.revenue?.recent?.length > 0) {
                    <table class="data-table">
                      <thead>
                        <tr>
                          <th>Data</th>
                          <th>Valor</th>
                        </tr>
                      </thead>
                      <tbody>
                        @for (t of breakdownData?.revenue?.recent; track t.id) {
                          <tr>
                            <td>{{ formatDate(t.created_at) }}</td>
                            <td>{{ formatValue(t.amount_usd, t.amount_brl) }}</td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  } @else {
                    <p class="modal-empty">Nenhuma transacao registrada</p>
                  }
                }
              }

              <!-- Profit Modal -->
              @if (activeModal === 'profit') {
                @if (modalLoading) {
                  <p class="modal-loading">Carregando...</p>
                } @else {
                  <div class="breakdown-section">
                    <div class="profit-line">
                      <span class="profit-label">Receita (creditos comprados)</span>
                      <span class="profit-value positive">+ {{ formatValue(breakdownData?.profit?.revenue_usd, breakdownData?.profit?.revenue_brl) }}</span>
                    </div>
                    <div class="profit-line">
                      <span class="profit-label">Custos Operacionais (APIs)</span>
                      <span class="profit-value negative">- {{ formatValue(breakdownData?.profit?.platform_cost_usd, breakdownData?.profit?.platform_cost_brl) }}</span>
                    </div>
                    <div class="profit-line">
                      <span class="profit-label">Bonus Concedidos (investimento)</span>
                      <span class="profit-value negative">- {{ formatValue(breakdownData?.profit?.bonus_usd, breakdownData?.profit?.bonus_brl) }}</span>
                    </div>
                    <div class="profit-divider"></div>
                    <div class="profit-line total">
                      <span class="profit-label">Resultado</span>
                      <span class="profit-value" [class.positive]="breakdownData?.profit?.profit_usd >= 0" [class.negative]="breakdownData?.profit?.profit_usd < 0">
                        {{ formatValue(breakdownData?.profit?.profit_usd, breakdownData?.profit?.profit_brl) }}
                      </span>
                    </div>
                  </div>
                }
              }

            </div>
          </div>
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
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 32px;
    }

    .header-left {
      display: flex;
      flex-direction: column;
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

    .exchange-rate-banner {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      margin-top: 12px;
      padding: 6px 14px;
      border-radius: 8px;
      background: rgba(139, 92, 246, 0.1);
      border: 1px solid rgba(139, 92, 246, 0.25);
      color: #a78bfa;
      font-size: 13px;
      font-weight: 500;
    }

    .exchange-rate-banner mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    /* Currency Toggle */
    .currency-toggle {
      display: flex;
      gap: 0;
      border: 1px solid #27272a;
      border-radius: 8px;
      overflow: hidden;
      flex-shrink: 0;
    }

    .toggle-btn {
      padding: 6px 16px;
      background: transparent;
      border: none;
      color: #71717a;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .toggle-btn.active {
      background: #8b5cf6;
      color: #fafafa;
    }

    .toggle-btn:hover:not(.active) {
      color: #a1a1aa;
      background: rgba(255, 255, 255, 0.05);
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
      gap: 16px;
      margin-bottom: 16px;
    }

    .summary-row.three-cols {
      grid-template-columns: repeat(3, 1fr);
    }

    .summary-row.two-cols {
      grid-template-columns: repeat(2, 1fr);
      margin-bottom: 32px;
    }

    .summary-card {
      border-radius: 12px;
      padding: 20px;
      border: 1px solid #27272a;
      display: flex;
      align-items: center;
      gap: 16px;
      cursor: pointer;
      transition: transform 0.2s, border-color 0.2s;
    }

    .summary-card:hover {
      transform: translateY(-2px);
      border-color: #3f3f46;
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

    .bonus-card {
      background: linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(245, 158, 11, 0.05));
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

    .bonus-card .summary-icon {
      background: rgba(245, 158, 11, 0.15);
      color: #f59e0b;
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

    .summary-hint {
      font-size: 11px;
      color: #71717a;
      margin-top: 2px;
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

    .platform-role-desc {
      font-size: 13px;
      color: #71717a;
      line-height: 1.5;
      margin: 0 0 16px;
      padding: 0 4px;
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

    /* Modal */
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      backdrop-filter: blur(4px);
    }

    .modal-content {
      background: #18181b;
      border: 1px solid #27272a;
      border-radius: 16px;
      width: 90%;
      max-width: 600px;
      max-height: 80vh;
      overflow-y: auto;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 24px;
      border-bottom: 1px solid #27272a;
    }

    .modal-header h2 {
      font-size: 18px;
      font-weight: 600;
      color: #fafafa;
      margin: 0;
    }

    .modal-close {
      background: none;
      border: none;
      color: #71717a;
      cursor: pointer;
      padding: 4px;
      border-radius: 8px;
      display: flex;
      align-items: center;
    }

    .modal-close:hover {
      color: #fafafa;
      background: rgba(255, 255, 255, 0.05);
    }

    .modal-body {
      padding: 24px;
    }

    .modal-subtitle {
      color: #a1a1aa;
      font-size: 14px;
      margin: 0 0 16px;
    }

    .modal-loading {
      color: #71717a;
      text-align: center;
      padding: 40px 0;
    }

    .modal-empty {
      color: #71717a;
      text-align: center;
      padding: 24px 0;
      font-style: italic;
    }

    /* Data Table */
    .data-table {
      width: 100%;
      border-collapse: collapse;
    }

    .data-table th {
      text-align: left;
      padding: 8px 12px;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #71717a;
      border-bottom: 1px solid #27272a;
    }

    .data-table td {
      padding: 10px 12px;
      font-size: 14px;
      color: #fafafa;
      border-bottom: 1px solid rgba(39, 39, 42, 0.5);
    }

    .data-table tr:last-child td {
      border-bottom: none;
    }

    /* Breakdown */
    .breakdown-section {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .breakdown-item {
      background: rgba(255, 255, 255, 0.03);
      border-radius: 10px;
      padding: 16px;
    }

    .breakdown-header {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .breakdown-header mat-icon {
      color: #8b5cf6;
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .breakdown-name {
      flex: 1;
      font-size: 15px;
      font-weight: 500;
      color: #fafafa;
    }

    .breakdown-value {
      font-size: 15px;
      font-weight: 600;
      color: #fafafa;
    }

    .breakdown-detail {
      font-size: 13px;
      color: #71717a;
      margin: 8px 0 0 30px;
    }

    .breakdown-total {
      display: flex;
      justify-content: space-between;
      padding: 12px 16px;
      background: rgba(139, 92, 246, 0.1);
      border-radius: 10px;
      font-weight: 600;
      color: #fafafa;
      font-size: 15px;
    }

    /* Profit lines */
    .profit-line {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
    }

    .profit-label {
      color: #a1a1aa;
      font-size: 15px;
    }

    .profit-value {
      font-size: 15px;
      font-weight: 600;
    }

    .profit-value.positive {
      color: #22c55e;
    }

    .profit-value.negative {
      color: #ef4444;
    }

    .profit-divider {
      border-top: 1px solid #27272a;
      margin: 4px 0;
    }

    .profit-line.total {
      padding-top: 12px;
    }

    .profit-line.total .profit-label {
      color: #fafafa;
      font-weight: 600;
    }

    /* Responsive */
    @media (max-width: 900px) {
      .summary-row.three-cols {
        grid-template-columns: repeat(2, 1fr);
      }

      .summary-row.two-cols {
        grid-template-columns: 1fr;
      }

      .platforms-grid {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 600px) {
      .admin-page {
        padding: 16px;
      }

      .summary-row.three-cols,
      .summary-row.two-cols {
        grid-template-columns: 1fr;
      }

      .page-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 16px;
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
  exchangeRate: any = null;
  currency: 'BRL' | 'USD' = 'BRL';
  private maxSpend = 0;

  // Modal state
  activeModal: string | null = null;
  modalTitle = '';
  modalLoading = false;
  usersData: any = null;
  breakdownData: any = null;
  modalExchangeRate = 5.70;

  constructor(private http: HttpClient, public i18n: I18nService) {}

  ngOnInit(): void {
    const backendUrl = window.location.hostname === 'localhost' ? 'http://localhost:8001' : '';
    this.http.get<any>(`${backendUrl}/api/admin/platform-status`).subscribe({
      next: (data) => {
        this.platforms = data.platforms;
        this.summary = data.summary;
        this.exchangeRate = data.exchange_rate || null;
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
    return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  formatValue(usd: number, brl: number): string {
    if (this.currency === 'BRL') {
      return 'R$ ' + this.formatBrl(brl || 0);
    }
    return 'US$ ' + this.formatBrl(usd || 0);
  }

  getSpendPercent(platform: any): number {
    if (!this.maxSpend || this.maxSpend === 0) return 0;
    return Math.min((platform.total_spent_usd / this.maxSpend) * 100, 100);
  }

  openModal(type: string): void {
    this.activeModal = type;
    this.modalLoading = true;

    const backendUrl = window.location.hostname === 'localhost' ? 'http://localhost:8001' : '';

    switch (type) {
      case 'users':
        this.modalTitle = 'Usuarios Ativos';
        this.http.get<any>(`${backendUrl}/api/admin/users`).subscribe({
          next: (data) => { this.usersData = data; this.modalLoading = false; },
          error: () => { this.modalLoading = false; }
        });
        break;
      case 'cost':
        this.modalTitle = 'Custos Operacionais';
        this.loadBreakdown(backendUrl);
        break;
      case 'bonus':
        this.modalTitle = 'Bonus Concedidos (Investimento)';
        this.loadBreakdown(backendUrl);
        break;
      case 'revenue':
        this.modalTitle = 'Racional de Receita';
        this.loadBreakdown(backendUrl);
        break;
      case 'profit':
        this.modalTitle = 'Racional de Lucro';
        this.loadBreakdown(backendUrl);
        break;
    }
  }

  loadBreakdown(backendUrl: string): void {
    if (this.breakdownData) {
      this.modalLoading = false;
      return;
    }
    this.http.get<any>(`${backendUrl}/api/admin/cost-breakdown`).subscribe({
      next: (data) => {
        this.breakdownData = data;
        this.modalExchangeRate = data.exchange_rate?.rate || 5.70;
        this.modalLoading = false;
      },
      error: () => { this.modalLoading = false; }
    });
  }

  closeModal(): void {
    this.activeModal = null;
  }

  formatDate(iso: string): string {
    if (!iso) return '-';
    const d = new Date(iso);
    return d.toLocaleDateString('pt-BR');
  }
}
