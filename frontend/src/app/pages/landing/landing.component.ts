import { Component, OnInit, OnDestroy, PLATFORM_ID, Inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule, MatButtonModule],
  template: `
    <!-- Sticky Header -->
    <header class="lp-header" [class.scrolled]="scrolled">
      <div class="lp-container header-inner">
        <a routerLink="/landing" class="brand-logo">VendedorIA</a>
        <a routerLink="/login" class="btn-enter">Entrar</a>
      </div>
    </header>

    <!-- Hero Section -->
    <section class="hero">
      <div class="hero-glow hero-glow--left"></div>
      <div class="hero-glow hero-glow--right"></div>
      <div class="lp-container hero-inner">
        <span class="hero-badge">Plataforma de Marketing com IA</span>
        <h1 class="hero-title">
          Venda Mais com o<br/>
          <span class="gradient-text">Poder da Inteligencia Artificial</span>
        </h1>
        <p class="hero-subtitle">
          Cadastre produtos, crie campanhas no Meta Ads, TikTok e WhatsApp,
          e acompanhe resultados &mdash; tudo conversando com uma IA especialista em marketing.
        </p>
        <div class="hero-actions">
          <a routerLink="/login" class="btn-primary btn-lg">
            Comecar Gratis
            <mat-icon>arrow_forward</mat-icon>
          </a>
          <a href="#como-funciona" class="btn-ghost btn-lg">
            Como Funciona
            <mat-icon>expand_more</mat-icon>
          </a>
        </div>
        <div class="hero-metrics">
          <div class="metric-item">
            <span class="metric-value">100%</span>
            <span class="metric-label">Automatizado</span>
          </div>
          <div class="metric-divider"></div>
          <div class="metric-item">
            <span class="metric-value">3</span>
            <span class="metric-label">Plataformas</span>
          </div>
          <div class="metric-divider"></div>
          <div class="metric-item">
            <span class="metric-value">IA</span>
            <span class="metric-label">Generativa</span>
          </div>
        </div>
      </div>
    </section>

    <!-- Benefits Section -->
    <section class="benefits section-animate" id="beneficios">
      <div class="lp-container">
        <span class="section-badge">Recursos</span>
        <h2 class="section-title">Tudo que voce precisa para<br/><span class="gradient-text">vender mais online</span></h2>
        <p class="section-subtitle">Uma plataforma completa de marketing com inteligencia artificial que trabalha para voce 24 horas por dia.</p>
        <div class="benefits-grid">
          @for (benefit of benefits; track benefit.title) {
            <div class="benefit-card section-animate">
              <div class="benefit-icon-wrap">
                <mat-icon>{{ benefit.icon }}</mat-icon>
              </div>
              <h3>{{ benefit.title }}</h3>
              <p>{{ benefit.description }}</p>
            </div>
          }
        </div>
      </div>
    </section>

    <!-- How It Works -->
    <section class="how-it-works section-animate" id="como-funciona">
      <div class="lp-container">
        <span class="section-badge">Simples e Rapido</span>
        <h2 class="section-title">Como Funciona</h2>
        <p class="section-subtitle">Tres passos para transformar suas vendas com inteligencia artificial.</p>
        <div class="steps-grid">
          @for (step of steps; track step.number; let i = $index) {
            <div class="step-card section-animate">
              <div class="step-number">{{ step.number }}</div>
              <div class="step-icon-wrap">
                <mat-icon>{{ step.icon }}</mat-icon>
              </div>
              <h3>{{ step.title }}</h3>
              <p>{{ step.description }}</p>
              @if (i < steps.length - 1) {
                <div class="step-connector"></div>
              }
            </div>
          }
        </div>
      </div>
    </section>

    <!-- Platforms Section -->
    <section class="platforms section-animate" id="plataformas">
      <div class="lp-container">
        <span class="section-badge">Integracoes</span>
        <h2 class="section-title">Multi-Plataforma,<br/><span class="gradient-text">um so lugar</span></h2>
        <p class="section-subtitle">Gerencie todas as suas campanhas publicitarias em um unico painel.</p>
        <div class="platforms-grid">
          @for (platform of platforms; track platform.name) {
            <div class="platform-card section-animate" [style.--accent]="platform.color">
              <span class="platform-emoji">{{ platform.emoji }}</span>
              <h3>{{ platform.name }}</h3>
              <p>{{ platform.description }}</p>
              <span class="platform-badge" [style.background]="platform.color + '22'" [style.color]="platform.color">
                Integrado
              </span>
            </div>
          }
        </div>
      </div>
    </section>

    <!-- Final CTA -->
    <section class="final-cta section-animate">
      <div class="lp-container final-cta-inner">
        <div class="cta-glow"></div>
        <h2>Pronto para Revolucionar<br/><span class="gradient-text">suas Vendas?</span></h2>
        <p>Comece agora mesmo a usar inteligencia artificial para criar campanhas, gerar criativos e vender mais.</p>
        <a routerLink="/login" class="btn-primary btn-lg">
          Comecar Agora
          <mat-icon>arrow_forward</mat-icon>
        </a>
      </div>
    </section>

    <!-- Footer -->
    <footer class="lp-footer">
      <div class="lp-container footer-inner">
        <div class="footer-brand">
          <span class="brand-logo">VendedorIA</span>
          <p>Plataforma de Marketing com Inteligencia Artificial</p>
        </div>
        <p class="copyright">&copy; 2026 VendedorIA. Todos os direitos reservados.</p>
      </div>
    </footer>
  `,
  styles: [`
    /* ===== Reset & Base ===== */
    :host {
      display: block;
      background: #09090b;
      color: #fafafa;
      font-family: Inter, system-ui, -apple-system, sans-serif;
      overflow-x: hidden;
      scroll-behavior: smooth;
    }

    .lp-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 24px;
    }

    .gradient-text {
      background: linear-gradient(135deg, #8b5cf6, #ec4899);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    /* ===== Header ===== */
    .lp-header {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 100;
      padding: 16px 0;
      transition: all 0.3s ease;
      border-bottom: 1px solid transparent;
    }

    .lp-header.scrolled {
      background: rgba(9, 9, 11, 0.8);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border-bottom-color: #27272a;
      padding: 12px 0;
    }

    .header-inner {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .brand-logo {
      font-size: 24px;
      font-weight: 800;
      letter-spacing: -0.5px;
      background: linear-gradient(135deg, #8b5cf6, #ec4899);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      text-decoration: none;
    }

    .btn-enter {
      padding: 8px 24px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      color: #fafafa;
      background: rgba(139, 92, 246, 0.15);
      border: 1px solid rgba(139, 92, 246, 0.3);
      text-decoration: none;
      transition: all 0.2s ease;
    }

    .btn-enter:hover {
      background: rgba(139, 92, 246, 0.25);
      border-color: rgba(139, 92, 246, 0.5);
      transform: translateY(-1px);
    }

    /* ===== Buttons ===== */
    .btn-primary {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 14px 32px;
      border-radius: 12px;
      font-size: 16px;
      font-weight: 600;
      color: #fff;
      background: linear-gradient(135deg, #8b5cf6, #ec4899);
      text-decoration: none;
      transition: all 0.25s ease;
      border: none;
      cursor: pointer;
      box-shadow: 0 0 30px rgba(139, 92, 246, 0.3);
    }

    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 0 50px rgba(139, 92, 246, 0.45);
    }

    .btn-primary mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .btn-ghost {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 14px 28px;
      border-radius: 12px;
      font-size: 16px;
      font-weight: 500;
      color: #a1a1aa;
      background: transparent;
      border: 1px solid #27272a;
      text-decoration: none;
      transition: all 0.25s ease;
      cursor: pointer;
    }

    .btn-ghost:hover {
      color: #fafafa;
      border-color: #3f3f46;
      background: rgba(255,255,255,0.03);
      transform: translateY(-2px);
    }

    .btn-ghost mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .btn-lg {
      padding: 16px 36px;
      font-size: 17px;
    }

    /* ===== Hero ===== */
    .hero {
      position: relative;
      padding: 160px 0 100px;
      text-align: center;
      overflow: hidden;
    }

    .hero-glow {
      position: absolute;
      width: 600px;
      height: 600px;
      border-radius: 50%;
      filter: blur(120px);
      opacity: 0.15;
      pointer-events: none;
    }

    .hero-glow--left {
      background: #8b5cf6;
      top: -200px;
      left: -200px;
    }

    .hero-glow--right {
      background: #ec4899;
      top: -100px;
      right: -200px;
    }

    .hero-inner {
      position: relative;
      z-index: 1;
    }

    .hero-badge {
      display: inline-block;
      padding: 6px 16px;
      border-radius: 100px;
      font-size: 13px;
      font-weight: 500;
      color: #c4b5fd;
      background: rgba(139, 92, 246, 0.1);
      border: 1px solid rgba(139, 92, 246, 0.2);
      margin-bottom: 32px;
      animation: fadeInDown 0.8s ease;
    }

    .hero-title {
      font-size: clamp(36px, 6vw, 72px);
      font-weight: 800;
      letter-spacing: -2px;
      line-height: 1.05;
      margin: 0 0 24px;
      animation: fadeInUp 0.8s ease 0.1s both;
    }

    .hero-subtitle {
      max-width: 640px;
      margin: 0 auto 40px;
      font-size: clamp(16px, 2vw, 19px);
      line-height: 1.7;
      color: #a1a1aa;
      animation: fadeInUp 0.8s ease 0.2s both;
    }

    .hero-actions {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 16px;
      flex-wrap: wrap;
      animation: fadeInUp 0.8s ease 0.3s both;
    }

    .hero-metrics {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 32px;
      margin-top: 72px;
      animation: fadeInUp 0.8s ease 0.5s both;
    }

    .metric-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
    }

    .metric-value {
      font-size: 28px;
      font-weight: 800;
      background: linear-gradient(135deg, #8b5cf6, #ec4899);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .metric-label {
      font-size: 13px;
      color: #71717a;
      font-weight: 500;
    }

    .metric-divider {
      width: 1px;
      height: 40px;
      background: #27272a;
    }

    /* ===== Section Shared ===== */
    .section-badge {
      display: inline-block;
      padding: 6px 16px;
      border-radius: 100px;
      font-size: 13px;
      font-weight: 500;
      color: #c4b5fd;
      background: rgba(139, 92, 246, 0.1);
      border: 1px solid rgba(139, 92, 246, 0.2);
      margin-bottom: 20px;
    }

    .section-title {
      font-size: clamp(28px, 4vw, 48px);
      font-weight: 800;
      letter-spacing: -1.5px;
      line-height: 1.1;
      margin: 0 0 16px;
    }

    .section-subtitle {
      font-size: 17px;
      color: #a1a1aa;
      line-height: 1.7;
      max-width: 560px;
      margin: 0 auto 56px;
    }

    /* ===== Benefits ===== */
    .benefits {
      padding: 120px 0;
      text-align: center;
    }

    .benefits-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
    }

    .benefit-card {
      text-align: left;
      padding: 32px;
      border-radius: 16px;
      background: rgba(24, 24, 27, 0.6);
      border: 1px solid #27272a;
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      transition: all 0.3s ease;
    }

    .benefit-card:hover {
      border-color: rgba(139, 92, 246, 0.3);
      background: rgba(24, 24, 27, 0.9);
      transform: translateY(-4px);
      box-shadow: 0 20px 40px -12px rgba(0,0,0,0.5);
    }

    .benefit-icon-wrap {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 48px;
      height: 48px;
      border-radius: 12px;
      background: linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(236, 72, 153, 0.15));
      margin-bottom: 20px;
    }

    .benefit-icon-wrap mat-icon {
      color: #c4b5fd;
      font-size: 24px;
      width: 24px;
      height: 24px;
    }

    .benefit-card h3 {
      font-size: 17px;
      font-weight: 700;
      margin: 0 0 8px;
      color: #fafafa;
    }

    .benefit-card p {
      font-size: 14px;
      line-height: 1.6;
      color: #a1a1aa;
      margin: 0;
    }

    /* ===== How It Works ===== */
    .how-it-works {
      padding: 120px 0;
      text-align: center;
      background: rgba(24, 24, 27, 0.3);
    }

    .steps-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 40px;
      position: relative;
    }

    .step-card {
      position: relative;
      text-align: center;
      padding: 40px 24px;
    }

    .step-number {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      font-size: 14px;
      font-weight: 800;
      color: #fff;
      background: linear-gradient(135deg, #8b5cf6, #ec4899);
      margin-bottom: 20px;
    }

    .step-icon-wrap {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 64px;
      height: 64px;
      border-radius: 16px;
      background: rgba(139, 92, 246, 0.1);
      border: 1px solid rgba(139, 92, 246, 0.15);
      margin-bottom: 24px;
    }

    .step-icon-wrap mat-icon {
      color: #c4b5fd;
      font-size: 32px;
      width: 32px;
      height: 32px;
    }

    .step-card h3 {
      font-size: 18px;
      font-weight: 700;
      margin: 0 0 8px;
    }

    .step-card p {
      font-size: 15px;
      color: #a1a1aa;
      line-height: 1.6;
      margin: 0;
    }

    .step-connector {
      display: none;
    }

    /* connector line between steps on desktop */
    @media (min-width: 769px) {
      .step-connector {
        display: block;
        position: absolute;
        top: 58px;
        right: -24px;
        width: 48px;
        height: 2px;
        background: linear-gradient(90deg, rgba(139,92,246,0.4), rgba(236,72,153,0.4));
      }
    }

    /* ===== Platforms ===== */
    .platforms {
      padding: 120px 0;
      text-align: center;
    }

    .platforms-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
    }

    .platform-card {
      padding: 36px 28px;
      border-radius: 16px;
      background: rgba(24, 24, 27, 0.6);
      border: 1px solid #27272a;
      text-align: center;
      transition: all 0.3s ease;
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
    }

    .platform-card:hover {
      border-color: var(--accent, #8b5cf6);
      transform: translateY(-4px);
      box-shadow: 0 20px 40px -12px rgba(0,0,0,0.4);
    }

    .platform-emoji {
      font-size: 48px;
      display: block;
      margin-bottom: 16px;
    }

    .platform-card h3 {
      font-size: 18px;
      font-weight: 700;
      margin: 0 0 8px;
    }

    .platform-card p {
      font-size: 14px;
      color: #a1a1aa;
      line-height: 1.6;
      margin: 0 0 20px;
    }

    .platform-badge {
      display: inline-block;
      padding: 4px 14px;
      border-radius: 100px;
      font-size: 12px;
      font-weight: 600;
    }

    /* ===== Final CTA ===== */
    .final-cta {
      padding: 120px 0;
      text-align: center;
    }

    .final-cta-inner {
      position: relative;
      padding: 80px 40px;
      border-radius: 24px;
      background: rgba(24, 24, 27, 0.5);
      border: 1px solid #27272a;
      overflow: hidden;
    }

    .cta-glow {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 500px;
      height: 500px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(139,92,246,0.15), transparent 70%);
      pointer-events: none;
    }

    .final-cta-inner h2 {
      position: relative;
      font-size: clamp(28px, 4vw, 44px);
      font-weight: 800;
      letter-spacing: -1px;
      line-height: 1.1;
      margin: 0 0 16px;
    }

    .final-cta-inner p {
      position: relative;
      font-size: 17px;
      color: #a1a1aa;
      line-height: 1.7;
      max-width: 520px;
      margin: 0 auto 36px;
    }

    .final-cta-inner .btn-primary {
      position: relative;
    }

    /* ===== Footer ===== */
    .lp-footer {
      padding: 48px 0;
      border-top: 1px solid #1a1a1e;
    }

    .footer-inner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 16px;
    }

    .footer-brand {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .footer-brand p {
      font-size: 14px;
      color: #52525b;
      margin: 0;
    }

    .copyright {
      font-size: 13px;
      color: #3f3f46;
      margin: 0;
    }

    /* ===== Scroll Animations ===== */
    .section-animate {
      opacity: 0;
      transform: translateY(32px);
      transition: opacity 0.7s ease, transform 0.7s ease;
    }

    .section-animate.visible {
      opacity: 1;
      transform: translateY(0);
    }

    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(24px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes fadeInDown {
      from {
        opacity: 0;
        transform: translateY(-16px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    /* ===== Responsive ===== */
    @media (max-width: 768px) {
      .hero {
        padding: 120px 0 80px;
      }

      .hero-title {
        letter-spacing: -1px;
      }

      .hero-metrics {
        gap: 20px;
        margin-top: 56px;
      }

      .metric-value {
        font-size: 22px;
      }

      .benefits-grid,
      .steps-grid,
      .platforms-grid {
        grid-template-columns: 1fr;
        gap: 16px;
      }

      .benefits, .how-it-works, .platforms, .final-cta {
        padding: 80px 0;
      }

      .final-cta-inner {
        padding: 56px 24px;
      }

      .footer-inner {
        flex-direction: column;
        text-align: center;
      }

      .footer-brand {
        flex-direction: column;
        gap: 8px;
      }

      .btn-lg {
        padding: 14px 28px;
        font-size: 15px;
      }

      .hero-actions {
        flex-direction: column;
      }
    }

    @media (min-width: 769px) and (max-width: 1024px) {
      .benefits-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }
  `],
})
export class LandingComponent implements OnInit, OnDestroy {
  scrolled = false;
  private observer!: IntersectionObserver;
  private isBrowser: boolean;

  benefits = [
    {
      icon: 'inventory_2',
      title: 'Cadastre Produtos pelo Chat',
      description: 'Adicione, edite e remova produtos conversando naturalmente com a IA.',
    },
    {
      icon: 'campaign',
      title: 'Campanhas Meta Ads com IA',
      description: 'Crie campanhas no Facebook e Instagram otimizadas por inteligencia artificial.',
    },
    {
      icon: 'auto_awesome',
      title: 'Criativos Gerados por IA',
      description: 'Imagens e textos publicitarios criados automaticamente para seus anuncios.',
    },
    {
      icon: 'analytics',
      title: 'Metricas em Tempo Real',
      description: 'Acompanhe impressoes, cliques, conversoes e ROI das suas campanhas ao vivo.',
    },
    {
      icon: 'hub',
      title: 'Multi-Plataforma',
      description: 'Meta Ads, TikTok Ads e WhatsApp Business integrados em um so lugar.',
    },
    {
      icon: 'psychology',
      title: 'Assistente de Marketing',
      description: 'A IA recomenda estrategias, publico-alvo e orcamento ideal para seu negocio.',
    },
  ];

  steps = [
    {
      number: '1',
      icon: 'add_shopping_cart',
      title: 'Cadastre seu Produto',
      description: 'Descreva seu produto ou servico no chat e a IA organiza tudo.',
    },
    {
      number: '2',
      icon: 'smart_toy',
      title: 'IA Cria sua Campanha',
      description: 'Escolha a plataforma e a IA gera criativos, define publico e orcamento.',
    },
    {
      number: '3',
      icon: 'trending_up',
      title: 'Acompanhe e Venda',
      description: 'Monitore metricas em tempo real e a IA otimiza seus resultados.',
    },
  ];

  platforms = [
    {
      name: 'Meta Ads',
      emoji: '\uD83D\uDCF1',
      description: 'Anuncie no Facebook e Instagram com campanhas otimizadas por IA.',
      color: '#3b82f6',
    },
    {
      name: 'TikTok Ads',
      emoji: '\uD83C\uDFB5',
      description: 'Alcance novos publicos com anuncios no TikTok gerados automaticamente.',
      color: '#ec4899',
    },
    {
      name: 'WhatsApp Business',
      emoji: '\uD83D\uDCAC',
      description: 'Engaje clientes diretamente pelo WhatsApp com mensagens inteligentes.',
      color: '#22c55e',
    },
  ];

  private scrollHandler = () => {
    this.scrolled = window.scrollY > 20;
  };

  constructor(@Inject(PLATFORM_ID) platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    if (!this.isBrowser) return;

    window.addEventListener('scroll', this.scrollHandler, { passive: true });

    // Intersection Observer for scroll-based fade-in
    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      },
      { threshold: 0.1 }
    );

    // Observe after a tick so DOM is ready
    setTimeout(() => {
      document.querySelectorAll('.section-animate').forEach((el) => {
        this.observer.observe(el);
      });
    });
  }

  ngOnDestroy(): void {
    if (!this.isBrowser) return;
    window.removeEventListener('scroll', this.scrollHandler);
    this.observer?.disconnect();
  }
}
