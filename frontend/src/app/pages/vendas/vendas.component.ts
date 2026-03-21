import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

interface Campaign {
  id: number;
  name: string;
  status: string;
  platform: string;
  created_at: string;
}

@Component({
  selector: 'app-vendas',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
  ],
  template: `
    <div class="vendas-page">
      <!-- Hero section -->
      <div class="hero-section">
        <div class="hero-text">
          <h1>Vendas</h1>
          <p>Inicie uma nova venda e lance campanhas com IA</p>
        </div>
        <button class="cta-btn" (click)="novaVenda()">
          <mat-icon>add</mat-icon>
          Nova Venda
        </button>
      </div>

      <!-- Sales list -->
      @if (loading) {
        <div class="loading-state">
          <mat-icon class="spin">hourglass_empty</mat-icon>
          <p>Carregando...</p>
        </div>
      } @else if (campaigns.length === 0) {
        <div class="empty-state">
          <div class="empty-icon">
            <mat-icon>rocket_launch</mat-icon>
          </div>
          <h3>Nenhuma venda ainda</h3>
          <p>Crie sua primeira venda e lance uma campanha com poucos cliques.</p>
          <button class="btn-primary" (click)="novaVenda()">
            <mat-icon>add</mat-icon>
            Comecar Agora
          </button>
        </div>
      } @else {
        <div class="section-label">Campanhas Recentes</div>
        <div class="campaigns-list">
          @for (campaign of campaigns; track campaign.id) {
            <div class="campaign-row">
              <div class="campaign-icon">
                <mat-icon>campaign</mat-icon>
              </div>
              <div class="campaign-info">
                <span class="campaign-name">{{ campaign.name }}</span>
                <span class="campaign-date">{{ campaign.created_at | date:'dd/MM/yyyy' }}</span>
              </div>
              <span class="campaign-status"
                    [class.active]="campaign.status === 'active'"
                    [class.paused]="campaign.status === 'paused'"
                    [class.draft]="campaign.status === 'draft'">
                {{ campaign.status }}
              </span>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
      padding: 32px;
    }

    .hero-section {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 40px;
      padding: 32px;
      background: linear-gradient(135deg, rgba(139, 92, 246, 0.08), rgba(236, 72, 153, 0.05));
      border: 1px solid #27272a;
      border-radius: 20px;
    }

    .hero-text {
      h1 {
        font-size: 32px;
        font-weight: 800;
        color: #fafafa;
        margin: 0 0 6px;
        letter-spacing: -1px;
      }

      p {
        color: #71717a;
        font-size: 15px;
        margin: 0;
      }
    }

    .cta-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: linear-gradient(135deg, #8b5cf6, #7c3aed);
      color: white;
      border: none;
      border-radius: 12px;
      padding: 14px 32px;
      font-size: 16px;
      font-weight: 700;
      cursor: pointer;
      transition: transform 0.15s, box-shadow 0.2s;
      flex-shrink: 0;

      mat-icon {
        font-size: 22px;
        width: 22px;
        height: 22px;
      }

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 24px rgba(139, 92, 246, 0.35);
      }
    }

    .section-label {
      font-size: 13px;
      font-weight: 600;
      color: #52525b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 14px;
    }

    .campaigns-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .campaign-row {
      display: flex;
      align-items: center;
      gap: 14px;
      background: #18181b;
      border: 1px solid #27272a;
      border-radius: 12px;
      padding: 14px 18px;
      transition: border-color 0.15s;

      &:hover {
        border-color: #3f3f46;
      }
    }

    .campaign-icon {
      width: 38px;
      height: 38px;
      border-radius: 10px;
      background: rgba(139, 92, 246, 0.12);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;

      mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
        color: #8b5cf6;
      }
    }

    .campaign-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .campaign-name {
      font-size: 15px;
      font-weight: 600;
      color: #e4e4e7;
    }

    .campaign-date {
      font-size: 12px;
      color: #52525b;
    }

    .campaign-status {
      font-size: 12px;
      font-weight: 600;
      padding: 4px 12px;
      border-radius: 20px;
      text-transform: capitalize;

      &.active {
        background: rgba(34, 197, 94, 0.12);
        color: #22c55e;
      }

      &.paused {
        background: rgba(251, 146, 60, 0.12);
        color: #fb923c;
      }

      &.draft {
        background: rgba(113, 113, 122, 0.12);
        color: #71717a;
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

    .empty-state {
      text-align: center;
      padding: 80px 0;

      .empty-icon {
        margin-bottom: 20px;

        mat-icon {
          font-size: 72px;
          width: 72px;
          height: 72px;
          color: #27272a;
        }
      }

      h3 {
        font-size: 22px;
        font-weight: 700;
        color: #a1a1aa;
        margin: 0 0 8px;
      }

      p {
        font-size: 15px;
        color: #52525b;
        margin: 0 0 28px;
        max-width: 400px;
        margin-left: auto;
        margin-right: auto;
      }
    }

    .btn-primary {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: #8b5cf6;
      color: white;
      border: none;
      border-radius: 10px;
      padding: 12px 28px;
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

    .spin {
      animation: spin 1.5s linear infinite;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    @media (max-width: 600px) {
      .hero-section {
        flex-direction: column;
        gap: 20px;
        text-align: center;
      }
    }
  `],
})
export class VendasComponent implements OnInit {
  private apiUrl = window.location.hostname === 'localhost'
    ? 'http://localhost:8000/api'
    : '/api';

  campaigns: Campaign[] = [];
  loading = true;

  constructor(
    private http: HttpClient,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.loadCampaigns();
  }

  private loadCampaigns(): void {
    this.http.get<Campaign[]>(`${this.apiUrl}/campaigns`).subscribe({
      next: (campaigns) => {
        this.campaigns = campaigns;
        this.loading = false;
      },
      error: () => {
        this.campaigns = [];
        this.loading = false;
      },
    });
  }

  novaVenda(): void {
    this.router.navigate(['/vendas/nova']);
  }
}
