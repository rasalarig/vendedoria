import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService, AuthUser } from '../../services/auth.service';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

interface DashboardData {
  sellers: any[];
  products: any[];
  videos: any[];
  campaigns: any[];
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, MatIconModule, RouterModule],
  template: `
    <!-- Hero / Empty State -->
    <div class="page-container" [class.loaded]="!loading">
      <ng-container *ngIf="loading">
        <div class="loading-state">
          <div class="spinner"></div>
          <p>Carregando seus dados...</p>
        </div>
      </ng-container>

      <ng-container *ngIf="!loading && isEmpty">
        <div class="hero-section">
          <div class="hero-content">
            <h1 class="hero-title">Ola, {{ userName }}! <span class="wave">&#x1F44B;</span></h1>
            <p class="hero-subtitle">Vamos criar sua primeira campanha de vendas</p>
            <a routerLink="/wizard" class="cta-button">
              <mat-icon>rocket_launch</mat-icon>
              Comecar agora
            </a>
          </div>

          <div class="journey-steps">
            <div class="journey-step" *ngFor="let step of journeySteps; let last = last">
              <div class="step-card" [style.border-color]="step.color">
                <div class="step-icon-wrapper" [style.background]="step.color + '20'" [style.color]="step.color">
                  <mat-icon>{{ step.icon }}</mat-icon>
                </div>
                <span class="step-number">{{ step.number }}</span>
                <span class="step-label">{{ step.label }}</span>
              </div>
              <div class="step-arrow" *ngIf="!last">
                <mat-icon>arrow_forward</mat-icon>
              </div>
            </div>
          </div>
        </div>
      </ng-container>

      <ng-container *ngIf="!loading && !isEmpty">
        <div class="dashboard-header">
          <h1 class="dashboard-title">Ola, {{ userName }}! <span class="wave">&#x1F44B;</span></h1>
          <p class="dashboard-subtitle">Aqui esta o resumo da sua jornada de vendas</p>
        </div>

        <div class="cards-grid">
          <!-- Vendedores -->
          <div class="summary-card" [style.border-left-color]="cardConfig[0].color">
            <div class="card-header">
              <div class="card-icon" [style.background]="cardConfig[0].color + '20'" [style.color]="cardConfig[0].color">
                <mat-icon>face</mat-icon>
              </div>
              <span class="card-count">{{ data.sellers.length }}</span>
            </div>
            <h3 class="card-label">Vendedores</h3>
            <div class="card-actions">
              <a routerLink="/sellers" class="card-link">Ver todos</a>
              <a routerLink="/sellers/create" class="card-link primary">Criar novo</a>
            </div>
          </div>

          <!-- Produtos -->
          <div class="summary-card" [style.border-left-color]="cardConfig[1].color">
            <div class="card-header">
              <div class="card-icon" [style.background]="cardConfig[1].color + '20'" [style.color]="cardConfig[1].color">
                <mat-icon>inventory_2</mat-icon>
              </div>
              <span class="card-count">{{ data.products.length }}</span>
            </div>
            <h3 class="card-label">Produtos</h3>
            <div class="card-actions">
              <a routerLink="/products" class="card-link">Ver todos</a>
              <a routerLink="/products" class="card-link primary">Cadastrar</a>
            </div>
          </div>

          <!-- Videos -->
          <div class="summary-card" [style.border-left-color]="cardConfig[2].color">
            <div class="card-header">
              <div class="card-icon" [style.background]="cardConfig[2].color + '20'" [style.color]="cardConfig[2].color">
                <mat-icon>videocam</mat-icon>
              </div>
              <span class="card-count">{{ data.videos.length }}</span>
            </div>
            <h3 class="card-label">Videos de Referencia</h3>
            <div class="card-actions">
              <a routerLink="/videos" class="card-link">Ver galeria</a>
            </div>
          </div>

          <!-- Criativos -->
          <div class="summary-card" [style.border-left-color]="cardConfig[3].color">
            <div class="card-header">
              <div class="card-icon" [style.background]="cardConfig[3].color + '20'" [style.color]="cardConfig[3].color">
                <mat-icon>auto_awesome</mat-icon>
              </div>
              <span class="card-count">{{ creativesCount }}</span>
            </div>
            <h3 class="card-label">Criativos Gerados</h3>
            <div class="card-actions">
              <a routerLink="/creatives" class="card-link">Ver criativos</a>
            </div>
          </div>

          <!-- Campanhas -->
          <div class="summary-card" [style.border-left-color]="cardConfig[4].color">
            <div class="card-header">
              <div class="card-icon" [style.background]="cardConfig[4].color + '20'" [style.color]="cardConfig[4].color">
                <mat-icon>campaign</mat-icon>
              </div>
              <span class="card-count">{{ activeCampaigns }}</span>
            </div>
            <h3 class="card-label">Campanhas Ativas</h3>
            <div class="card-actions">
              <a routerLink="/campaigns" class="card-link">Ver campanhas</a>
            </div>
          </div>
        </div>

        <!-- Quick Stats Bar -->
        <div class="stats-bar" *ngIf="activeCampaigns > 0">
          <div class="stat-item">
            <span class="stat-value">R$ {{ totalSpent | number:'1.2-2' }}</span>
            <span class="stat-label">Total Gasto</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
            <span class="stat-value">{{ totalClicks | number }}</span>
            <span class="stat-label">Cliques Totais</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
            <span class="stat-value">{{ totalImpressions | number }}</span>
            <span class="stat-label">Impressoes</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
            <span class="stat-value">{{ estimatedRoi }}%</span>
            <span class="stat-label">ROI Estimado</span>
          </div>
        </div>
      </ng-container>
    </div>
  `,
  styles: [`
    .page-container {
      padding: 32px;
      max-width: 1200px;
      margin: 0 auto;
      opacity: 0;
      transition: opacity 0.4s ease;
    }
    .page-container.loaded { opacity: 1; }

    /* Loading */
    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 400px;
      color: #71717a;
    }
    .spinner {
      width: 40px; height: 40px;
      border: 3px solid #27272a;
      border-top-color: #8b5cf6;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin-bottom: 16px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* Hero */
    .hero-section {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 48px 0;
      animation: fadeUp 0.5s ease;
    }
    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .hero-title {
      font-size: 36px;
      font-weight: 700;
      color: #fafafa;
      margin: 0 0 12px;
    }
    .wave { display: inline-block; }
    .hero-subtitle {
      font-size: 18px;
      color: #a1a1aa;
      margin: 0 0 32px;
    }
    .cta-button {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 14px 32px;
      background: #8b5cf6;
      color: #fff;
      border: none;
      border-radius: 12px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      transition: background 0.2s, transform 0.2s;
    }
    .cta-button:hover {
      background: #7c3aed;
      transform: translateY(-2px);
    }

    /* Journey Steps */
    .journey-steps {
      display: flex;
      align-items: center;
      justify-content: center;
      flex-wrap: wrap;
      gap: 0;
      margin-top: 56px;
      padding: 0 16px;
    }
    .journey-step {
      display: flex;
      align-items: center;
      gap: 0;
    }
    .step-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding: 20px 16px;
      background: #18181b;
      border: 1px solid #27272a;
      border-radius: 12px;
      min-width: 130px;
      transition: border-color 0.2s, transform 0.2s;
    }
    .step-card:hover {
      transform: translateY(-4px);
    }
    .step-icon-wrapper {
      width: 44px; height: 44px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .step-icon-wrapper mat-icon {
      font-size: 22px; width: 22px; height: 22px;
    }
    .step-number {
      font-size: 11px;
      font-weight: 600;
      color: #71717a;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .step-label {
      font-size: 13px;
      font-weight: 500;
      color: #d4d4d8;
      text-align: center;
    }
    .step-arrow {
      color: #52525b;
      padding: 0 6px;
      display: flex;
      align-items: center;
    }
    .step-arrow mat-icon { font-size: 20px; width: 20px; height: 20px; }

    /* Dashboard Header */
    .dashboard-header {
      margin-bottom: 32px;
      animation: fadeUp 0.5s ease;
    }
    .dashboard-title {
      font-size: 28px;
      font-weight: 700;
      color: #fafafa;
      margin: 0 0 8px;
    }
    .dashboard-subtitle {
      font-size: 15px;
      color: #71717a;
      margin: 0;
    }

    /* Cards Grid */
    .cards-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
      animation: fadeUp 0.5s ease 0.1s both;
    }
    .summary-card {
      background: #18181b;
      border: 1px solid #27272a;
      border-left: 4px solid #8b5cf6;
      border-radius: 12px;
      padding: 24px;
      transition: border-color 0.2s, transform 0.2s, box-shadow 0.2s;
    }
    .summary-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
      border-color: #3f3f46;
    }
    .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
    }
    .card-icon {
      width: 44px; height: 44px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .card-icon mat-icon {
      font-size: 22px; width: 22px; height: 22px;
    }
    .card-count {
      font-size: 32px;
      font-weight: 700;
      color: #fafafa;
    }
    .card-label {
      font-size: 15px;
      font-weight: 500;
      color: #a1a1aa;
      margin: 0 0 16px;
    }
    .card-actions {
      display: flex;
      gap: 12px;
    }
    .card-link {
      font-size: 13px;
      color: #71717a;
      text-decoration: none;
      padding: 6px 12px;
      border-radius: 6px;
      border: 1px solid #27272a;
      transition: all 0.2s;
    }
    .card-link:hover {
      color: #fafafa;
      border-color: #3f3f46;
    }
    .card-link.primary {
      color: #8b5cf6;
      border-color: #8b5cf640;
    }
    .card-link.primary:hover {
      background: #8b5cf620;
      border-color: #8b5cf6;
    }

    /* Stats Bar */
    .stats-bar {
      display: flex;
      align-items: center;
      justify-content: space-around;
      background: #18181b;
      border: 1px solid #27272a;
      border-radius: 12px;
      padding: 24px;
      margin-top: 24px;
      animation: fadeUp 0.5s ease 0.2s both;
    }
    .stat-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
    }
    .stat-value {
      font-size: 20px;
      font-weight: 700;
      color: #fafafa;
    }
    .stat-label {
      font-size: 13px;
      color: #71717a;
    }
    .stat-divider {
      width: 1px;
      height: 40px;
      background: #27272a;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .page-container { padding: 20px; }
      .hero-title { font-size: 28px; }
      .cards-grid { grid-template-columns: 1fr; }
      .journey-steps { flex-direction: column; gap: 4px; }
      .step-arrow { transform: rotate(90deg); padding: 4px 0; }
      .stats-bar { flex-direction: column; gap: 20px; }
      .stat-divider { width: 60px; height: 1px; }
    }
  `]
})
export class HomeComponent implements OnInit {
  private http = inject(HttpClient);
  private auth = inject(AuthService);

  loading = true;
  isEmpty = true;
  userName = '';

  data: DashboardData = { sellers: [], products: [], videos: [], campaigns: [] };
  creativesCount = 0;
  activeCampaigns = 0;

  // Placeholder stats
  totalSpent = 1250.00;
  totalClicks = 3420;
  totalImpressions = 48500;
  estimatedRoi = 320;

  private backendUrl = window.location.hostname === 'localhost' ? 'http://localhost:8000' : '';

  journeySteps = [
    { number: 'Passo 1', label: 'Criar Vendedor', icon: 'face', color: '#8b5cf6' },
    { number: 'Passo 2', label: 'Cadastrar Produto', icon: 'inventory_2', color: '#3b82f6' },
    { number: 'Passo 3', label: 'Subir Videos', icon: 'videocam', color: '#10b981' },
    { number: 'Passo 4', label: 'Gerar Criativo', icon: 'auto_awesome', color: '#f59e0b' },
    { number: 'Passo 5', label: 'Lancar Campanha', icon: 'campaign', color: '#ef4444' },
  ];

  cardConfig = [
    { color: '#8b5cf6' },
    { color: '#3b82f6' },
    { color: '#10b981' },
    { color: '#f59e0b' },
    { color: '#ef4444' },
  ];

  ngOnInit(): void {
    const user = this.auth.currentUser;
    this.userName = user?.name?.split(' ')[0] || 'Empreendedor';

    forkJoin({
      sellers: this.http.get<any[]>(`${this.backendUrl}/api/sellers`).pipe(catchError(() => of([]))),
      products: this.http.get<any[]>(`${this.backendUrl}/api/products`).pipe(catchError(() => of([]))),
      videos: this.http.get<any[]>(`${this.backendUrl}/api/reference-videos`).pipe(catchError(() => of([]))),
      campaigns: this.http.get<any[]>(`${this.backendUrl}/api/campaigns`).pipe(catchError(() => of([]))),
    }).subscribe(result => {
      this.data = result;
      this.activeCampaigns = result.campaigns.filter((c: any) => c.status === 'active' || c.status === 'ACTIVE').length;
      this.creativesCount = 0; // Will be computed when creatives endpoint exists

      const totalItems = result.sellers.length + result.products.length + result.videos.length + result.campaigns.length;
      this.isEmpty = totalItems === 0;
      this.loading = false;
    });
  }
}
