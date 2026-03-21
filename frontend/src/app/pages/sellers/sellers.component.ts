import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { SellerService, Seller, SellerFace } from '../../services/seller.service';

@Component({
  selector: 'app-sellers',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule],
  template: `
    <div class="sellers-page">
      <div class="page-header">
        <div>
          <h1>Seus Vendedores</h1>
          <p class="subtitle">Gerencie seus vendedores virtuais</p>
        </div>
        <button mat-flat-button color="primary" (click)="goToCreate()">
          <mat-icon>add</mat-icon>
          Criar Vendedor
        </button>
      </div>

      @if (loading) {
        <div class="loading-state">
          <mat-icon class="spin">hourglass_empty</mat-icon>
          <p>Carregando...</p>
        </div>
      }

      @if (!loading && sellers.length === 0) {
        <div class="empty-state">
          <div class="empty-illustration">
            <mat-icon class="empty-icon">face</mat-icon>
          </div>
          <h2>Nenhum vendedor ainda</h2>
          <p class="empty-hint">Crie seu primeiro vendedor virtual e comece a vender com inteligencia artificial.</p>
          <button mat-flat-button color="primary" class="cta-button" (click)="goToCreate()">
            <mat-icon>person_add</mat-icon>
            Crie seu primeiro vendedor virtual
          </button>
        </div>
      }

      @if (!loading && sellers.length > 0) {
        <div class="sellers-grid">
          @for (seller of sellers; track seller.id) {
            <div class="seller-card">
              <div class="card-avatar">
                @if (getFaceThumbnail(seller.avatar_face)) {
                  <img [src]="getFaceThumbnail(seller.avatar_face)" [alt]="seller.name">
                } @else {
                  <div class="avatar-placeholder">
                    <mat-icon>face</mat-icon>
                  </div>
                }
              </div>
              <div class="card-info">
                <h3 class="seller-name">{{ seller.name }}</h3>
                @if (seller.personality) {
                  <span class="personality-badge">{{ seller.personality }}</span>
                }
                @if (getVoiceName(seller.voice_id)) {
                  <p class="voice-label">
                    <mat-icon class="inline-icon">record_voice_over</mat-icon>
                    {{ getVoiceName(seller.voice_id) }}
                  </p>
                }
              </div>
              <button class="delete-btn" (click)="confirmDelete(seller, $event)">
                <mat-icon>delete_outline</mat-icon>
              </button>
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

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 32px;

      h1 {
        font-size: 32px;
        font-weight: 800;
        color: #fafafa;
        margin: 0;
        letter-spacing: -1px;
      }

      .subtitle {
        color: #71717a;
        font-size: 14px;
        margin: 4px 0 0;
      }

      button {
        border-radius: 10px;
        padding: 8px 24px;
      }
    }

    .loading-state {
      text-align: center;
      padding: 80px 20px;
      color: #71717a;

      mat-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        opacity: 0.3;
      }

      p { font-size: 16px; }
    }

    .spin {
      animation: spin 1.5s linear infinite;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .empty-state {
      text-align: center;
      padding: 80px 20px;

      .empty-illustration {
        width: 120px;
        height: 120px;
        border-radius: 50%;
        background: linear-gradient(135deg, #18181b, #27272a);
        border: 2px dashed #3f3f46;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 24px;
      }

      .empty-icon {
        font-size: 56px;
        width: 56px;
        height: 56px;
        color: #8b5cf6;
        opacity: 0.4;
      }

      h2 {
        font-size: 22px;
        font-weight: 700;
        color: #fafafa;
        margin: 0 0 8px;
      }

      .empty-hint {
        color: #71717a;
        font-size: 15px;
        margin: 0 0 28px;
        max-width: 400px;
        margin-left: auto;
        margin-right: auto;
      }

      .cta-button {
        border-radius: 10px;
        padding: 10px 28px;
        font-size: 15px;
      }
    }

    .sellers-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 20px;
    }

    .seller-card {
      background: #18181b;
      border: 1px solid #27272a;
      border-radius: 16px;
      overflow: hidden;
      padding: 20px;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      position: relative;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
      cursor: default;

      &:hover {
        transform: translateY(-3px) scale(1.01);
        box-shadow: 0 8px 32px rgba(139, 92, 246, 0.12);
        border-color: #3f3f46;
      }

      &:hover .delete-btn {
        opacity: 1;
      }
    }

    .card-avatar {
      width: 96px;
      height: 96px;
      border-radius: 50%;
      overflow: hidden;
      margin-bottom: 16px;
      background: #09090b;
      border: 2px solid #27272a;

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .avatar-placeholder {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;

        mat-icon {
          font-size: 48px;
          width: 48px;
          height: 48px;
          color: #3f3f46;
        }
      }
    }

    .card-info {
      flex: 1;
    }

    .seller-name {
      font-size: 18px;
      font-weight: 600;
      color: #fafafa;
      margin: 0 0 8px;
      letter-spacing: -0.3px;
    }

    .personality-badge {
      display: inline-block;
      background: rgba(139, 92, 246, 0.15);
      color: #a78bfa;
      font-size: 12px;
      font-weight: 600;
      padding: 3px 12px;
      border-radius: 20px;
      margin-bottom: 8px;
      text-transform: capitalize;
    }

    .voice-label {
      font-size: 13px;
      color: #71717a;
      margin: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;

      .inline-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
      }
    }

    .delete-btn {
      position: absolute;
      top: 12px;
      right: 12px;
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid transparent;
      border-radius: 8px;
      padding: 6px;
      cursor: pointer;
      opacity: 0;
      transition: opacity 0.2s ease, background 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;

      mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
        color: #ef4444;
      }

      &:hover {
        background: rgba(239, 68, 68, 0.2);
        border-color: rgba(239, 68, 68, 0.3);
      }
    }
  `],
})
export class SellersComponent implements OnInit {
  sellers: Seller[] = [];
  faces: SellerFace[] = [];
  voiceMap: Record<string, string> = {};
  faceMap: Record<string, string> = {};
  loading = true;

  constructor(
    private sellerService: SellerService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading = true;

    // Load faces catalog for thumbnails
    this.sellerService.getFaces().subscribe({
      next: (faces) => {
        this.faces = faces;
        faces.forEach(f => this.faceMap[f.id] = f.thumbnail_url);
      },
    });

    // Load voices catalog for names
    this.sellerService.getVoices().subscribe({
      next: (voices) => {
        voices.forEach(v => this.voiceMap[v.id] = v.name);
      },
    });

    // Load sellers
    this.sellerService.getSellers().subscribe({
      next: (sellers) => {
        this.sellers = sellers;
        this.loading = false;
      },
      error: () => {
        this.sellers = [];
        this.loading = false;
      },
    });
  }

  getFaceThumbnail(faceId: string): string | null {
    return this.faceMap[faceId] || null;
  }

  getVoiceName(voiceId: string): string | null {
    return this.voiceMap[voiceId] || null;
  }

  goToCreate(): void {
    this.router.navigate(['/sellers/create']);
  }

  confirmDelete(seller: Seller, event: Event): void {
    event.stopPropagation();
    const confirmed = window.confirm(`Tem certeza que deseja excluir "${seller.name}"?`);
    if (confirmed) {
      this.sellerService.deleteSeller(seller.id).subscribe({
        next: () => this.loadData(),
      });
    }
  }
}
