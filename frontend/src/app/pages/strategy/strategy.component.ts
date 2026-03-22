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
import { MatExpansionModule } from '@angular/material/expansion';
import { MatDividerModule } from '@angular/material/divider';
import { StrategyService, MarketStrategy } from '../../services/strategy.service';
import { ProductService, Product } from '../../services/product.service';

@Component({
  selector: 'app-strategy',
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
    MatExpansionModule,
    MatDividerModule,
  ],
  template: `
    <div class="strategy-page">
      <!-- Header -->
      <div class="page-header">
        <h1>Estrategia de Marketing IA</h1>
        <p class="page-subtitle">Pesquisa de mercado e estrategia completa gerada por inteligencia artificial</p>

        <div class="header-actions">
          <mat-form-field appearance="outline" class="product-select">
            <mat-label>Selecione um produto</mat-label>
            <mat-select [(value)]="selectedProductId">
              @for (product of products; track product.id) {
                <mat-option [value]="product.id">{{ product.name }} - R$ {{ product.price | number:'1.2-2' }}</mat-option>
              }
            </mat-select>
          </mat-form-field>

          <button mat-flat-button class="generate-btn"
                  [disabled]="!selectedProductId || generating"
                  (click)="generateStrategy()">
            @if (generating) {
              <mat-spinner diameter="20" class="btn-spinner"></mat-spinner>
              <span>{{ loadingMessage }}</span>
            } @else {
              <mat-icon>psychology</mat-icon>
              <span>Gerar Estrategia</span>
            }
          </button>
        </div>
      </div>

      <!-- Loading overlay -->
      @if (generating) {
        <div class="generating-overlay">
          <div class="loading-animation">
            <mat-spinner diameter="64"></mat-spinner>
          </div>
          <p class="loading-title">{{ loadingMessage }}</p>
          <p class="loading-hint">Isso pode levar de 10 a 30 segundos</p>
          <div class="loading-steps">
            @for (step of loadingSteps; track step; let i = $index) {
              <div class="loading-step" [class.active]="i <= currentLoadingStep" [class.done]="i < currentLoadingStep">
                <mat-icon>{{ i < currentLoadingStep ? 'check_circle' : (i === currentLoadingStep ? 'pending' : 'radio_button_unchecked') }}</mat-icon>
                <span>{{ step }}</span>
              </div>
            }
          </div>
        </div>
      }

      <!-- Strategy Report -->
      @if (strategy && !generating) {
        <div class="strategy-report">

          <!-- 1. Market Analysis -->
          <mat-card class="report-card accent-blue">
            <mat-card-header>
              <mat-icon class="section-icon">analytics</mat-icon>
              <mat-card-title>Analise de Mercado</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <p class="report-text">{{ strategy.market_analysis }}</p>
            </mat-card-content>
          </mat-card>

          <!-- 2. Target Audience -->
          <mat-card class="report-card accent-purple">
            <mat-card-header>
              <mat-icon class="section-icon">groups</mat-icon>
              <mat-card-title>Publico-Alvo Ideal</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <p class="report-text">{{ strategy.target_audience_analysis }}</p>
            </mat-card-content>
          </mat-card>

          <!-- 3. Best Times -->
          <mat-card class="report-card accent-orange">
            <mat-card-header>
              <mat-icon class="section-icon">schedule</mat-icon>
              <mat-card-title>Melhores Horarios para Publicar</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="times-section">
                <div class="times-group">
                  <h4>Dias da Semana</h4>
                  <div class="chips-row">
                    @for (day of strategy.best_times?.weekdays || []; track day) {
                      <span class="time-chip day-chip">{{ day }}</span>
                    }
                  </div>
                </div>
                <div class="times-group">
                  <h4>Horarios</h4>
                  <div class="chips-row">
                    @for (hour of strategy.best_times?.hours || []; track hour) {
                      <span class="time-chip hour-chip">
                        <mat-icon class="chip-icon">schedule</mat-icon>
                        {{ hour }}
                      </span>
                    }
                  </div>
                </div>
              </div>
            </mat-card-content>
          </mat-card>

          <!-- 4. Recommended Channels -->
          <mat-card class="report-card accent-cyan">
            <mat-card-header>
              <mat-icon class="section-icon">devices</mat-icon>
              <mat-card-title>Canais Recomendados</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="channels-row">
                @for (channel of strategy.recommended_channels || []; track channel) {
                  <div class="channel-card">
                    <mat-icon>{{ getChannelIcon(channel) }}</mat-icon>
                    <span>{{ channel }}</span>
                  </div>
                }
              </div>
            </mat-card-content>
          </mat-card>

          <!-- 5. Tone of Voice -->
          <mat-card class="report-card accent-pink">
            <mat-card-header>
              <mat-icon class="section-icon">record_voice_over</mat-icon>
              <mat-card-title>Tom de Voz</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <p class="report-text">{{ strategy.tone_of_voice }}</p>
            </mat-card-content>
          </mat-card>

          <!-- 6. Selling Arguments -->
          <mat-card class="report-card accent-green">
            <mat-card-header>
              <mat-icon class="section-icon">trending_up</mat-icon>
              <mat-card-title>Argumentos de Venda</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="arguments-list">
                @for (arg of strategy.selling_arguments || []; track arg; let i = $index) {
                  <div class="argument-item">
                    <span class="argument-number">{{ i + 1 }}</span>
                    <span class="argument-text">{{ arg }}</span>
                  </div>
                }
              </div>
            </mat-card-content>
          </mat-card>

          <!-- 7. Common Objections -->
          <mat-card class="report-card accent-red">
            <mat-card-header>
              <mat-icon class="section-icon">shield</mat-icon>
              <mat-card-title>Objecoes e Respostas</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <mat-accordion>
                @for (obj of strategy.common_objections || []; track obj.objection; let i = $index) {
                  <mat-expansion-panel class="objection-panel">
                    <mat-expansion-panel-header>
                      <mat-panel-title>
                        <span class="objection-number">{{ i + 1 }}</span>
                        <span class="objection-title">{{ obj.objection }}</span>
                      </mat-panel-title>
                    </mat-expansion-panel-header>
                    <div class="objection-content">
                      <div class="objection-side">
                        <div class="label-tag red-tag">Objecao</div>
                        <p>{{ obj.objection }}</p>
                      </div>
                      <div class="response-side">
                        <div class="label-tag green-tag">Resposta</div>
                        <p>{{ obj.response }}</p>
                      </div>
                    </div>
                  </mat-expansion-panel>
                }
              </mat-accordion>
            </mat-card-content>
          </mat-card>

          <!-- 8. Budget Suggestion -->
          <mat-card class="report-card accent-yellow">
            <mat-card-header>
              <mat-icon class="section-icon">payments</mat-icon>
              <mat-card-title>Sugestao de Orcamento</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <p class="report-text">{{ strategy.budget_suggestion }}</p>
            </mat-card-content>
          </mat-card>

          <!-- 9. Competitor Insights -->
          <mat-card class="report-card accent-indigo">
            <mat-card-header>
              <mat-icon class="section-icon">search</mat-icon>
              <mat-card-title>Analise da Concorrencia</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <p class="report-text">{{ strategy.competitor_insights }}</p>
            </mat-card-content>
          </mat-card>

          <!-- 10. Web Research Data -->
          <mat-card class="report-card accent-gray">
            <mat-card-header>
              <mat-icon class="section-icon">language</mat-icon>
              <mat-card-title>Dados da Pesquisa Web</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <mat-expansion-panel class="research-panel">
                <mat-expansion-panel-header>
                  <mat-panel-title>Clique para ver os dados brutos da pesquisa</mat-panel-title>
                </mat-expansion-panel-header>
                <pre class="research-data">{{ strategy.web_research_data }}</pre>
              </mat-expansion-panel>
            </mat-card-content>
          </mat-card>
        </div>
      }

      <!-- Empty state -->
      @if (!strategy && !generating && !loading) {
        <div class="empty-state">
          <mat-icon class="empty-icon">psychology</mat-icon>
          <p>Selecione um produto e clique em "Gerar Estrategia"</p>
          <p class="empty-hint">A IA vai pesquisar o mercado e criar uma estrategia completa de marketing</p>
        </div>
      }

      <!-- Previous Strategies -->
      @if (previousStrategies.length > 0 && !generating) {
        <div class="previous-section">
          <h2>Estrategias Anteriores</h2>
          <div class="previous-grid">
            @for (prev of previousStrategies; track prev.id) {
              <mat-card class="previous-card" (click)="loadStrategy(prev)">
                <mat-card-content>
                  <div class="prev-header">
                    <mat-icon>description</mat-icon>
                    <div>
                      <h4>{{ prev.product_name }}</h4>
                      <span class="prev-date">{{ prev.created_at | date:'dd/MM/yyyy HH:mm' }}</span>
                    </div>
                  </div>
                  <p class="prev-preview">{{ prev.market_analysis?.substring(0, 120) }}...</p>
                  <button mat-icon-button class="delete-btn" (click)="deleteStrategy(prev, $event)">
                    <mat-icon>delete</mat-icon>
                  </button>
                </mat-card-content>
              </mat-card>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
      padding: 24px;
    }

    .page-header {
      margin-bottom: 24px;

      h1 {
        font-size: 28px;
        font-weight: 300;
        color: #ffffff;
        margin: 0 0 4px;
      }

      .page-subtitle {
        color: #71717a;
        font-size: 14px;
        margin: 0 0 20px;
      }

      .header-actions {
        display: flex;
        align-items: center;
        gap: 16px;
        flex-wrap: wrap;
      }
    }

    .product-select {
      min-width: 320px;

      ::ng-deep .mat-mdc-text-field-wrapper {
        background: #18181b !important;
      }

      ::ng-deep .mat-mdc-select-value,
      ::ng-deep .mat-mdc-floating-label,
      ::ng-deep .mat-mdc-select-arrow {
        color: #a1a1aa !important;
      }

      ::ng-deep .mdc-notched-outline__leading,
      ::ng-deep .mdc-notched-outline__notch,
      ::ng-deep .mdc-notched-outline__trailing {
        border-color: #3f3f46 !important;
      }
    }

    .generate-btn {
      border-radius: 12px;
      padding: 8px 28px;
      height: 56px;
      font-size: 16px;
      display: flex;
      align-items: center;
      gap: 10px;
      background: linear-gradient(135deg, #8b5cf6, #7c3aed) !important;
      color: white !important;
      font-weight: 600;

      .btn-spinner {
        display: inline-block;
      }

      &:disabled {
        opacity: 0.5;
      }

      ::ng-deep .mat-mdc-button-persistent-ripple {
        border-radius: 12px;
      }
    }

    /* Loading overlay */
    .generating-overlay {
      text-align: center;
      padding: 60px 20px;

      .loading-animation {
        margin: 0 auto 20px;

        mat-spinner {
          margin: 0 auto;
        }
      }

      .loading-title {
        font-size: 20px;
        color: #a78bfa;
        font-weight: 500;
        margin: 0 0 8px;
      }

      .loading-hint {
        color: #52525b;
        font-size: 14px;
        margin: 0 0 32px;
      }
    }

    .loading-steps {
      display: flex;
      flex-direction: column;
      gap: 12px;
      max-width: 360px;
      margin: 0 auto;
      text-align: left;
    }

    .loading-step {
      display: flex;
      align-items: center;
      gap: 12px;
      color: #555;
      font-size: 14px;
      transition: all 0.3s ease;

      mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
        color: #444;
      }

      &.active {
        color: #a78bfa;

        mat-icon {
          color: #8b5cf6;
        }
      }

      &.done {
        color: #4caf50;

        mat-icon {
          color: #4caf50;
        }
      }
    }

    /* Empty state */
    .empty-state {
      text-align: center;
      padding: 80px 20px;
      color: #71717a;

      .empty-icon {
        font-size: 80px;
        width: 80px;
        height: 80px;
        opacity: 0.2;
        margin-bottom: 16px;
      }

      p {
        font-size: 18px;
        margin: 8px 0;
      }

      .empty-hint {
        font-size: 14px;
        opacity: 0.7;
      }
    }

    /* Strategy Report */
    .strategy-report {
      display: flex;
      flex-direction: column;
      gap: 20px;
      margin-bottom: 40px;
    }

    .report-card {
      background: #18181b !important;
      border-radius: 16px !important;
      color: white;
      border-left: 4px solid transparent;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3) !important;

      mat-card-header {
        display: flex;
        align-items: center;
        padding: 20px 20px 8px;

        .section-icon {
          font-size: 28px;
          width: 28px;
          height: 28px;
          margin-right: 12px;
        }

        ::ng-deep .mat-mdc-card-header-text {
          margin: 0;
        }

        mat-card-title {
          font-size: 18px;
          font-weight: 600;
          color: #fff;
        }
      }

      mat-card-content {
        padding: 12px 20px 20px;
      }
    }

    .accent-blue { border-left-color: #42a5f5; .section-icon { color: #42a5f5; } }
    .accent-purple { border-left-color: #ab47bc; .section-icon { color: #ab47bc; } }
    .accent-orange { border-left-color: #ff7043; .section-icon { color: #ff7043; } }
    .accent-cyan { border-left-color: #26c6da; .section-icon { color: #26c6da; } }
    .accent-pink { border-left-color: #ec407a; .section-icon { color: #ec407a; } }
    .accent-green { border-left-color: #66bb6a; .section-icon { color: #66bb6a; } }
    .accent-red { border-left-color: #ef5350; .section-icon { color: #ef5350; } }
    .accent-yellow { border-left-color: #ffca28; .section-icon { color: #ffca28; } }
    .accent-indigo { border-left-color: #5c6bc0; .section-icon { color: #5c6bc0; } }
    .accent-gray { border-left-color: #78909c; .section-icon { color: #78909c; } }

    .report-text {
      color: #a1a1aa;
      font-size: 15px;
      line-height: 1.7;
      margin: 0;
      white-space: pre-line;
    }

    /* Best Times */
    .times-section {
      display: flex;
      gap: 40px;
      flex-wrap: wrap;
    }

    .times-group {
      h4 {
        color: #a1a1aa;
        font-size: 13px;
        text-transform: uppercase;
        letter-spacing: 1px;
        margin: 0 0 12px;
      }
    }

    .chips-row {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .time-chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 14px;
      font-weight: 500;

      .chip-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
      }
    }

    .day-chip {
      background: rgba(255, 112, 67, 0.15);
      color: #ff7043;
      border: 1px solid rgba(255, 112, 67, 0.3);
    }

    .hour-chip {
      background: rgba(255, 112, 67, 0.1);
      color: #ffab91;
      border: 1px solid rgba(255, 112, 67, 0.2);
    }

    /* Channels */
    .channels-row {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }

    .channel-card {
      background: rgba(38, 198, 218, 0.1);
      border: 1px solid rgba(38, 198, 218, 0.25);
      border-radius: 12px;
      padding: 16px 20px;
      display: flex;
      align-items: center;
      gap: 10px;
      color: #80deea;
      font-size: 14px;
      font-weight: 500;

      mat-icon {
        color: #26c6da;
        font-size: 22px;
        width: 22px;
        height: 22px;
      }
    }

    /* Arguments */
    .arguments-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .argument-item {
      display: flex;
      align-items: flex-start;
      gap: 14px;
      padding: 14px 16px;
      background: rgba(102, 187, 106, 0.08);
      border-radius: 10px;
      border-left: 3px solid #66bb6a;
    }

    .argument-number {
      background: #66bb6a;
      color: #0a1628;
      width: 28px;
      height: 28px;
      min-width: 28px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 14px;
    }

    .argument-text {
      color: #a1a1aa;
      font-size: 15px;
      line-height: 1.5;
      padding-top: 3px;
    }

    /* Objections */
    .objection-panel {
      background: #27272a !important;
      color: white !important;
      margin-bottom: 8px;
      border-radius: 10px !important;

      ::ng-deep .mat-expansion-panel-header {
        color: white !important;
      }

      ::ng-deep .mat-expansion-panel-header-title {
        color: white !important;
        display: flex;
        align-items: center;
        gap: 10px;
      }

      ::ng-deep .mat-expansion-indicator::after {
        color: #a1a1aa !important;
      }
    }

    .objection-number {
      background: #ef5350;
      color: white;
      width: 24px;
      height: 24px;
      min-width: 24px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 12px;
    }

    .objection-title {
      color: #ffcdd2;
      font-weight: 500;
    }

    .objection-content {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      padding: 8px 0;
    }

    .objection-side,
    .response-side {
      padding: 14px;
      border-radius: 10px;

      p {
        margin: 8px 0 0;
        font-size: 14px;
        line-height: 1.6;
      }
    }

    .objection-side {
      background: rgba(239, 83, 80, 0.1);
      border: 1px solid rgba(239, 83, 80, 0.2);
      color: #ffcdd2;
    }

    .response-side {
      background: rgba(102, 187, 106, 0.1);
      border: 1px solid rgba(102, 187, 106, 0.2);
      color: #c8e6c9;
    }

    .label-tag {
      display: inline-block;
      padding: 2px 10px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .red-tag {
      background: rgba(239, 83, 80, 0.25);
      color: #ef5350;
    }

    .green-tag {
      background: rgba(102, 187, 106, 0.25);
      color: #66bb6a;
    }

    /* Research data */
    .research-panel {
      background: #27272a !important;
      color: white !important;

      ::ng-deep .mat-expansion-panel-header {
        color: #a1a1aa !important;
      }

      ::ng-deep .mat-expansion-panel-header-title {
        color: #a1a1aa !important;
      }

      ::ng-deep .mat-expansion-indicator::after {
        color: #52525b !important;
      }
    }

    .research-data {
      color: #71717a;
      font-size: 12px;
      line-height: 1.6;
      white-space: pre-wrap;
      word-break: break-word;
      font-family: 'Roboto Mono', monospace;
      margin: 0;
    }

    /* Previous strategies */
    .previous-section {
      margin-top: 48px;

      h2 {
        color: #fff;
        font-size: 22px;
        font-weight: 400;
        margin: 0 0 20px;
      }
    }

    .previous-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 16px;
    }

    .previous-card {
      background: #18181b !important;
      border-radius: 12px !important;
      color: white;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
      position: relative;

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 24px rgba(0, 0, 0, 0.4) !important;
      }

      .prev-header {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 10px;

        mat-icon {
          color: #8b5cf6;
        }

        h4 {
          margin: 0;
          font-size: 16px;
          color: #fff;
        }

        .prev-date {
          font-size: 12px;
          color: #52525b;
        }
      }

      .prev-preview {
        color: #71717a;
        font-size: 13px;
        line-height: 1.5;
        margin: 0;
      }

      .delete-btn {
        position: absolute;
        top: 8px;
        right: 8px;
        color: #52525b;

        &:hover {
          color: #ef5350;
        }
      }
    }

    @media (max-width: 768px) {
      .objection-content {
        grid-template-columns: 1fr;
      }

      .times-section {
        flex-direction: column;
        gap: 20px;
      }

      .header-actions {
        flex-direction: column;
        align-items: stretch !important;
      }

      .product-select {
        min-width: unset !important;
        width: 100%;
      }
    }
  `],
})
export class StrategyComponent implements OnInit {
  products: Product[] = [];
  selectedProductId: number | null = null;
  strategy: MarketStrategy | null = null;
  previousStrategies: MarketStrategy[] = [];
  generating = false;
  loading = false;

  loadingMessage = '';
  currentLoadingStep = 0;
  loadingSteps = [
    'Pesquisando mercado...',
    'Analisando concorrencia...',
    'Identificando publico-alvo...',
    'Gerando estrategia completa...',
  ];
  private loadingInterval: ReturnType<typeof setInterval> | null = null;

  constructor(
    private strategyService: StrategyService,
    private productService: ProductService,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.loadProducts();
    this.loadPreviousStrategies();
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

  loadPreviousStrategies(): void {
    this.strategyService.getAll().subscribe({
      next: (strategies) => {
        this.previousStrategies = strategies;
      },
      error: () => {
        this.previousStrategies = [];
      },
    });
  }

  generateStrategy(): void {
    if (!this.selectedProductId) return;
    this.generating = true;
    this.currentLoadingStep = 0;
    this.loadingMessage = this.loadingSteps[0];

    // Cycle through loading steps
    this.loadingInterval = setInterval(() => {
      if (this.currentLoadingStep < this.loadingSteps.length - 1) {
        this.currentLoadingStep++;
        this.loadingMessage = this.loadingSteps[this.currentLoadingStep];
      }
    }, 4000);

    this.strategyService.generate(this.selectedProductId).subscribe({
      next: (strategy) => {
        this.strategy = strategy;
        this.generating = false;
        this.clearLoadingInterval();
        this.loadPreviousStrategies();
        this.showMessage('Estrategia gerada com sucesso!');
      },
      error: () => {
        this.generating = false;
        this.clearLoadingInterval();
        this.showMessage('Erro ao gerar estrategia', true);
      },
    });
  }

  loadStrategy(strategy: MarketStrategy): void {
    this.strategy = strategy;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  deleteStrategy(strategy: MarketStrategy, event: Event): void {
    event.stopPropagation();
    this.strategyService.delete(strategy.id).subscribe({
      next: () => {
        this.previousStrategies = this.previousStrategies.filter(s => s.id !== strategy.id);
        if (this.strategy?.id === strategy.id) {
          this.strategy = null;
        }
        this.showMessage('Estrategia removida');
      },
      error: () => this.showMessage('Erro ao remover', true),
    });
  }

  getChannelIcon(channel: string): string {
    const lower = channel.toLowerCase();
    if (lower.includes('instagram')) return 'photo_camera';
    if (lower.includes('facebook')) return 'thumb_up';
    if (lower.includes('whatsapp')) return 'chat';
    if (lower.includes('google')) return 'search';
    if (lower.includes('youtube')) return 'play_circle';
    if (lower.includes('tiktok')) return 'music_note';
    if (lower.includes('email')) return 'email';
    if (lower.includes('linkedin')) return 'work';
    return 'campaign';
  }

  private clearLoadingInterval(): void {
    if (this.loadingInterval) {
      clearInterval(this.loadingInterval);
      this.loadingInterval = null;
    }
  }

  private showMessage(message: string, isError = false): void {
    this.snackBar.open(message, 'OK', {
      duration: 3000,
      panelClass: isError ? ['snackbar-error'] : ['snackbar-success'],
    });
  }
}
