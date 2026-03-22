import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

interface WizardStep {
  title: string;
  description: string;
  icon: string;
  color: string;
  cta: string;
  route: string;
}

@Component({
  selector: 'app-wizard',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule],
  template: `
    <div class="wizard-container">
      <!-- Progress Bar -->
      <div class="progress-bar">
        <div class="progress-track">
          <ng-container *ngFor="let step of steps; let i = index">
            <div
              class="progress-step"
              [class.completed]="completedSteps.has(i)"
              [class.active]="currentStep === i"
              [class.future]="currentStep < i && !completedSteps.has(i)"
              (click)="goToStep(i)"
            >
              <div
                class="step-circle"
                [style.borderColor]="currentStep === i || completedSteps.has(i) ? step.color : '#27272a'"
                [style.background]="completedSteps.has(i) ? step.color : 'transparent'"
              >
                <mat-icon *ngIf="completedSteps.has(i)" class="check-icon">check</mat-icon>
                <span *ngIf="!completedSteps.has(i)" class="step-number"
                  [style.color]="currentStep === i ? step.color : '#52525b'">{{ i + 1 }}</span>
              </div>
              <span class="step-label"
                [style.color]="currentStep === i ? step.color : completedSteps.has(i) ? '#a1a1aa' : '#52525b'">
                {{ step.title }}
              </span>
            </div>
            <div
              *ngIf="i < steps.length - 1"
              class="progress-line"
              [style.background]="completedSteps.has(i) ? steps[i].color : '#27272a'"
            ></div>
          </ng-container>
        </div>
      </div>

      <!-- Step Content -->
      <div class="content-area">
        <div
          class="step-content"
          [class.slide-left]="slideDirection === 'left'"
          [class.slide-right]="slideDirection === 'right'"
          [class.slide-in]="slideIn"
        >
          <div class="step-icon-wrapper">
            <mat-icon
              class="step-icon"
              [style.color]="steps[currentStep].color"
              [style.background]="steps[currentStep].color + '18'"
            >{{ steps[currentStep].icon }}</mat-icon>
          </div>
          <h2 class="step-title">{{ steps[currentStep].title }}</h2>
          <p class="step-description">{{ steps[currentStep].description }}</p>
          <button
            class="cta-button"
            [style.background]="'linear-gradient(135deg, ' + steps[currentStep].color + ', ' + steps[currentStep].color + 'cc)'"
            (click)="onCtaClick()"
          >
            {{ steps[currentStep].cta }}
            <mat-icon class="cta-arrow">arrow_forward</mat-icon>
          </button>
          <button class="skip-link" (click)="skipStep()">Pular etapa</button>
        </div>
      </div>

      <!-- Navigation -->
      <div class="nav-buttons">
        <button
          *ngIf="currentStep > 0"
          class="nav-btn nav-back"
          (click)="prevStep()"
        >
          <mat-icon>arrow_back</mat-icon>
          Voltar
        </button>
        <div *ngIf="currentStep === 0" class="nav-spacer"></div>
        <button
          class="nav-btn nav-next"
          [style.background]="steps[currentStep].color"
          (click)="nextStep()"
        >
          {{ currentStep === steps.length - 1 ? 'Concluir' : 'Proximo' }}
          <mat-icon>{{ currentStep === steps.length - 1 ? 'check' : 'arrow_forward' }}</mat-icon>
        </button>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
      background: #09090b;
    }

    .wizard-container {
      max-width: 900px;
      margin: 0 auto;
      padding: 48px 24px 32px;
      display: flex;
      flex-direction: column;
      min-height: calc(100vh - 64px);
    }

    /* ---- Progress Bar ---- */
    .progress-bar {
      margin-bottom: 48px;
    }

    .progress-track {
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .progress-step {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      z-index: 1;
    }

    .step-circle {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      border: 2px solid #27272a;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.25s ease;
      background: transparent;
    }

    .progress-step:hover .step-circle {
      transform: scale(1.15);
    }

    .progress-step.active .step-circle {
      animation: pulse 2s ease-in-out infinite;
    }

    .check-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
      color: #fff;
    }

    .step-number {
      font-size: 16px;
      font-weight: 600;
    }

    .step-label {
      font-size: 12px;
      font-weight: 500;
      white-space: nowrap;
      transition: color 0.2s ease;
    }

    .progress-line {
      height: 2px;
      flex: 1;
      max-width: 80px;
      min-width: 24px;
      margin: 0 4px;
      margin-bottom: 24px;
      border-radius: 1px;
      transition: background 0.3s ease;
    }

    /* ---- Content Area ---- */
    .content-area {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }

    .step-content {
      text-align: center;
      padding: 32px;
      max-width: 480px;
      width: 100%;
      transition: opacity 0.15s ease, transform 0.15s ease;
    }

    .step-content.slide-left {
      opacity: 0;
      transform: translateX(-60px);
    }

    .step-content.slide-right {
      opacity: 0;
      transform: translateX(60px);
    }

    .step-content.slide-in {
      opacity: 1;
      transform: translateX(0);
    }

    .step-icon-wrapper {
      display: flex;
      justify-content: center;
      margin-bottom: 24px;
    }

    .step-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      padding: 20px;
      border-radius: 24px;
    }

    .step-title {
      font-size: 24px;
      font-weight: 700;
      color: #fafafa;
      margin: 0 0 12px;
    }

    .step-description {
      font-size: 16px;
      color: #a1a1aa;
      margin: 0 0 32px;
      line-height: 1.5;
    }

    /* ---- CTA Button ---- */
    .cta-button {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 14px 32px;
      border: none;
      border-radius: 12px;
      color: #fff;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
      background-size: 200% 200%;
      animation: gradientShift 3s ease infinite;
    }

    .cta-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
    }

    .cta-arrow {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .skip-link {
      display: block;
      margin: 16px auto 0;
      background: none;
      border: none;
      color: #71717a;
      font-size: 14px;
      cursor: pointer;
      padding: 8px 16px;
      border-radius: 8px;
      transition: color 0.2s ease, background 0.2s ease;
    }

    .skip-link:hover {
      color: #a1a1aa;
      background: #18181b;
    }

    /* ---- Nav Buttons ---- */
    .nav-buttons {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 24px;
      border-top: 1px solid #1a1a1e;
    }

    .nav-spacer {
      flex: 1;
    }

    .nav-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 10px 20px;
      border: none;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .nav-back {
      background: #18181b;
      color: #a1a1aa;
      border: 1px solid #27272a;
    }

    .nav-back:hover {
      background: #27272a;
      color: #fafafa;
    }

    .nav-next {
      color: #fff;
      margin-left: auto;
    }

    .nav-next:hover {
      filter: brightness(1.15);
      transform: translateY(-1px);
    }

    .nav-btn mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    /* ---- Animations ---- */
    @keyframes pulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(139, 92, 246, 0.4); }
      50% { box-shadow: 0 0 0 8px rgba(139, 92, 246, 0); }
    }

    @keyframes gradientShift {
      0%, 100% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
    }

    /* ---- Responsive: mobile vertical progress ---- */
    @media (max-width: 767px) {
      .wizard-container {
        padding: 24px 16px;
        flex-direction: row;
        flex-wrap: wrap;
      }

      .progress-bar {
        width: 60px;
        margin-bottom: 0;
        margin-right: 16px;
        flex-shrink: 0;
      }

      .progress-track {
        flex-direction: column;
        align-items: flex-start;
      }

      .progress-step {
        flex-direction: row;
        gap: 10px;
      }

      .step-label {
        font-size: 11px;
      }

      .progress-line {
        width: 2px;
        height: 20px;
        min-width: unset;
        max-width: unset;
        margin: 4px 0 4px 21px;
        flex: unset;
      }

      .content-area {
        flex: 1;
        min-width: 0;
      }

      .step-content {
        padding: 16px 8px;
      }

      .step-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        padding: 16px;
      }

      .step-title {
        font-size: 20px;
      }

      .step-description {
        font-size: 14px;
      }

      .nav-buttons {
        width: 100%;
        flex-basis: 100%;
      }
    }
  `]
})
export class WizardComponent implements OnInit {
  steps: WizardStep[] = [
    {
      title: 'Vendedor',
      description: 'Crie seu vendedor virtual',
      icon: 'face',
      color: '#8b5cf6',
      cta: 'Criar Vendedor',
      route: '/sellers/create'
    },
    {
      title: 'Produto',
      description: 'Cadastre seu produto',
      icon: 'inventory_2',
      color: '#ec4899',
      cta: 'Cadastrar Produto',
      route: '/products'
    },
    {
      title: 'Videos',
      description: 'Suba videos de referencia',
      icon: 'video_library',
      color: '#f59e0b',
      cta: 'Subir Videos',
      route: '/videos'
    },
    {
      title: 'Criativo',
      description: 'Gere seu anuncio em video',
      icon: 'movie_creation',
      color: '#10b981',
      cta: 'Gerar Criativo',
      route: '/vendas'
    },
    {
      title: 'Campanha',
      description: 'Lance sua campanha',
      icon: 'rocket_launch',
      color: '#3b82f6',
      cta: 'Criar Campanha',
      route: '/vendas'
    }
  ];

  currentStep = 0;
  completedSteps = new Set<number>();
  slideDirection: 'left' | 'right' | null = null;
  slideIn = true;

  private readonly STORAGE_KEY = 'vendedoria_wizard_step';
  private readonly COMPLETED_KEY = 'vendedoria_wizard_completed';

  constructor(private router: Router) {}

  ngOnInit(): void {
    const saved = localStorage.getItem(this.STORAGE_KEY);
    if (saved !== null) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && parsed >= 0 && parsed < this.steps.length) {
        this.currentStep = parsed;
      }
    }
    const savedCompleted = localStorage.getItem(this.COMPLETED_KEY);
    if (savedCompleted) {
      try {
        const arr: number[] = JSON.parse(savedCompleted);
        this.completedSteps = new Set(arr);
      } catch { /* ignore */ }
    }
  }

  goToStep(index: number): void {
    if (index === this.currentStep) return;
    this.animateTransition(index > this.currentStep ? 'left' : 'right', index);
  }

  nextStep(): void {
    if (this.currentStep === this.steps.length - 1) {
      this.router.navigate(['/home']);
      return;
    }
    this.animateTransition('left', this.currentStep + 1);
  }

  prevStep(): void {
    if (this.currentStep === 0) return;
    this.animateTransition('right', this.currentStep - 1);
  }

  skipStep(): void {
    this.nextStep();
  }

  onCtaClick(): void {
    this.completedSteps.add(this.currentStep);
    this.persistState();
    this.router.navigate([this.steps[this.currentStep].route]);
  }

  private animateTransition(direction: 'left' | 'right', targetStep: number): void {
    this.slideIn = false;
    this.slideDirection = direction;

    setTimeout(() => {
      this.currentStep = targetStep;
      this.persistState();
      this.slideDirection = direction === 'left' ? 'right' : 'left';

      setTimeout(() => {
        this.slideDirection = null;
        this.slideIn = true;
      }, 20);
    }, 150);
  }

  private persistState(): void {
    localStorage.setItem(this.STORAGE_KEY, String(this.currentStep));
    localStorage.setItem(this.COMPLETED_KEY, JSON.stringify([...this.completedSteps]));
  }
}
