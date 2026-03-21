import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <mat-icon class="page-icon">home</mat-icon>
        <h1>Inicio</h1>
        <p class="subtitle">Sua jornada de vendas comeca aqui</p>
      </div>
      <div class="placeholder-content">
        <mat-icon class="placeholder-icon">construction</mat-icon>
        <p>Em construcao</p>
      </div>
    </div>
  `,
  styles: [`
    .page-container { padding: 32px; }
    .page-header { margin-bottom: 32px; }
    .page-header h1 { color: #fafafa; font-size: 28px; font-weight: 700; margin: 8px 0 4px; }
    .page-icon { font-size: 36px; width: 36px; height: 36px; color: #8b5cf6; }
    .subtitle { color: #71717a; font-size: 14px; margin: 0; }
    .placeholder-content {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      min-height: 400px; border: 2px dashed #27272a; border-radius: 16px;
      color: #52525b;
    }
    .placeholder-icon { font-size: 48px; width: 48px; height: 48px; margin-bottom: 16px; }
  `]
})
export class HomeComponent {}
