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
          <span class="gradient-text">Poder da Inteligência Artificial</span>
        </h1>
        <p class="hero-subtitle">
          Cadastre produtos, crie campanhas no Meta Ads, TikTok e WhatsApp,
          e acompanhe resultados &mdash; tudo conversando com uma IA especialista em marketing.
        </p>
        <div class="hero-actions">
          <a routerLink="/login" class="btn-primary btn-lg">
            Começar Grátis
            <mat-icon>arrow_forward</mat-icon>
          </a>
          <a (click)="scrollTo('como-funciona')" class="btn-ghost btn-lg" style="cursor:pointer">
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
        <h2 class="section-title">Tudo que você precisa para<br/><span class="gradient-text">vender mais online</span></h2>
        <p class="section-subtitle">Uma plataforma completa de marketing com inteligência artificial que trabalha para você 24 horas por dia.</p>
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

    <!-- How It Works - Tree View -->
    <section class="how-it-works section-animate" id="como-funciona">
      <div class="lp-container">
        <span class="section-badge">Como Funciona</span>
        <h2 class="section-title">Do cadastro ao resultado,<br/><span class="gradient-text">em poucos passos</span></h2>
        <p class="section-subtitle">Veja como a plataforma organiza todo o fluxo de vendas para você.</p>

        <div class="tree-view">
          <!-- Root node -->
          <div class="tree-root section-animate">
            <span class="tree-root-icon">&#x1F916;</span>
            <span class="tree-root-label">VendedorIA</span>
          </div>

          <!-- Trunk line -->
          <div class="tree-trunk"></div>

          <!-- Branches -->
          <div class="tree-branches">
            <!-- Branch 1: Cadastrar Produto -->
            <div class="tree-branch section-animate">
              <div class="tree-parent">
                <mat-icon>inventory_2</mat-icon>
                <span>Cadastrar Produto</span>
              </div>
              <ul class="tree-children">
                <li class="tree-child">
                  <mat-icon>chat</mat-icon>
                  <span>Via Chat com IA</span>
                </li>
                <li class="tree-child tree-child--last">
                  <mat-icon>image</mat-icon>
                  <span>Upload de Imagens</span>
                </li>
              </ul>
            </div>

            <!-- Branch 2: Cadastrar Venda -->
            <div class="tree-branch section-animate">
              <div class="tree-parent">
                <mat-icon>rocket_launch</mat-icon>
                <span>Cadastrar Venda</span>
              </div>
              <ul class="tree-children">
                <li class="tree-child">
                  <mat-icon>devices</mat-icon>
                  <span>Escolher Plataforma</span>
                </li>
                <li class="tree-child">
                  <mat-icon>auto_awesome</mat-icon>
                  <span>Gerar Criativos com IA</span>
                </li>
                <li class="tree-child tree-child--last">
                  <mat-icon>campaign</mat-icon>
                  <span>Lançar Campanha</span>
                </li>
              </ul>
            </div>

            <!-- Branch 3: Acompanhar Resultados -->
            <div class="tree-branch section-animate">
              <div class="tree-parent">
                <mat-icon>monitoring</mat-icon>
                <span>Acompanhar Resultados</span>
              </div>
              <ul class="tree-children">
                <li class="tree-child">
                  <mat-icon>speed</mat-icon>
                  <span>Métricas em Tempo Real</span>
                </li>
                <li class="tree-child tree-child--last">
                  <mat-icon>trending_up</mat-icon>
                  <span>ROI e Conversões</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Platforms Section -->
    <section class="platforms section-animate" id="plataformas">
      <div class="lp-container">
        <span class="section-badge">Integrações</span>
        <h2 class="section-title">Multi-Plataforma,<br/><span class="gradient-text">um só lugar</span></h2>
        <p class="section-subtitle">Gerencie todas as suas campanhas publicitárias em um único painel.</p>
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
        <p>Comece agora mesmo a usar inteligência artificial para criar campanhas, gerar criativos e vender mais.</p>
        <a routerLink="/login" class="btn-primary btn-lg">
          Começar Agora
          <mat-icon>arrow_forward</mat-icon>
        </a>
      </div>
    </section>

    <!-- Footer -->
    <footer class="lp-footer">
      <div class="lp-container footer-inner">
        <div class="footer-brand">
          <span class="brand-logo">VendedorIA</span>
          <p>Plataforma de Marketing com Inteligência Artificial</p>
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

    /* ===== Tree View ===== */
    .how-it-works {
      padding: 120px 0;
      text-align: center;
      background: rgba(24, 24, 27, 0.3);
    }

    .tree-view {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin-top: 20px;
    }

    /* Root node */
    .tree-root {
      display: inline-flex;
      align-items: center;
      gap: 12px;
      padding: 18px 36px;
      border-radius: 100px;
      background: linear-gradient(135deg, rgba(139,92,246,0.2), rgba(236,72,153,0.2));
      border: 2px solid rgba(139,92,246,0.4);
      box-shadow: 0 0 40px rgba(139,92,246,0.15);
    }

    .tree-root-icon {
      font-size: 28px;
    }

    .tree-root-label {
      font-size: 22px;
      font-weight: 800;
      background: linear-gradient(135deg, #8b5cf6, #ec4899);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    /* Trunk line from root to branches */
    .tree-trunk {
      width: 2px;
      height: 40px;
      background: linear-gradient(180deg, rgba(139,92,246,0.5), rgba(139,92,246,0.2));
    }

    /* Branches container */
    .tree-branches {
      display: flex;
      flex-direction: column;
      gap: 0;
      width: 100%;
      max-width: 520px;
      position: relative;
    }

    /* Vertical line connecting all branches */
    .tree-branches::before {
      content: '';
      position: absolute;
      top: 0;
      left: 28px;
      width: 2px;
      height: calc(100% - 40px);
      background: linear-gradient(180deg, rgba(139,92,246,0.4), rgba(139,92,246,0.15));
    }

    /* Single branch */
    .tree-branch {
      position: relative;
      padding-left: 28px;
    }

    .tree-branch + .tree-branch {
      margin-top: 8px;
    }

    /* Parent node */
    .tree-parent {
      position: relative;
      display: inline-flex;
      align-items: center;
      gap: 12px;
      padding: 12px 24px;
      border-radius: 12px;
      background: rgba(24, 24, 27, 0.8);
      border: 1px solid #27272a;
      margin-left: 28px;
      font-size: 16px;
      font-weight: 700;
      color: #fafafa;
      transition: all 0.25s ease;
    }

    /* Horizontal connector from vertical line to parent node */
    .tree-parent::before {
      content: '';
      position: absolute;
      top: 50%;
      left: -28px;
      width: 28px;
      height: 2px;
      background: rgba(139,92,246,0.35);
    }

    .tree-parent:hover {
      border-color: rgba(139,92,246,0.5);
      background: rgba(24, 24, 27, 1);
      box-shadow: 0 8px 24px -8px rgba(0,0,0,0.4);
      transform: translateX(4px);
    }

    .tree-parent mat-icon {
      color: #8b5cf6;
      font-size: 22px;
      width: 22px;
      height: 22px;
    }

    /* Children list */
    .tree-children {
      list-style: none;
      margin: 0;
      padding: 4px 0 8px 76px;
      position: relative;
    }

    /* Vertical line for children */
    .tree-children::before {
      content: '';
      position: absolute;
      top: 4px;
      left: 62px;
      width: 2px;
      height: calc(100% - 28px);
      background: rgba(139,92,246,0.2);
    }

    /* Child node */
    .tree-child {
      position: relative;
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 16px;
      margin-left: 20px;
      border-radius: 10px;
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.05);
      font-size: 14px;
      color: #a1a1aa;
      transition: all 0.2s ease;
      margin-bottom: 6px;
    }

    /* Horizontal connector from vertical line to child node */
    .tree-child::before {
      content: '';
      position: absolute;
      top: 50%;
      left: -20px;
      width: 20px;
      height: 2px;
      background: rgba(139,92,246,0.2);
    }

    /* L-shaped corner for non-last children */
    .tree-child::after {
      content: '';
      position: absolute;
      top: 0;
      left: -22px;
      width: 2px;
      height: calc(50% + 1px);
      background: transparent;
    }

    .tree-child:hover {
      background: rgba(255,255,255,0.06);
      color: #e4e4e7;
      border-color: rgba(139,92,246,0.2);
      transform: translateX(4px);
    }

    .tree-child mat-icon {
      color: #71717a;
      font-size: 18px;
      width: 18px;
      height: 18px;
      flex-shrink: 0;
    }

    .tree-child:hover mat-icon {
      color: #8b5cf6;
    }

    /* Last child -- round the connector corner */
    .tree-child--last {
      margin-bottom: 0;
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
      .platforms-grid {
        grid-template-columns: 1fr;
        gap: 16px;
      }

      .tree-branches {
        max-width: 100%;
      }

      .tree-parent {
        font-size: 14px;
        padding: 10px 18px;
      }

      .tree-child {
        font-size: 13px;
        padding: 7px 12px;
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
      description: 'Crie campanhas no Facebook e Instagram otimizadas por inteligência artificial.',
    },
    {
      icon: 'auto_awesome',
      title: 'Criativos Gerados por IA',
      description: 'Imagens e textos publicitários criados automaticamente para seus anúncios.',
    },
    {
      icon: 'analytics',
      title: 'Métricas em Tempo Real',
      description: 'Acompanhe impressões, cliques, conversões e ROI das suas campanhas ao vivo.',
    },
    {
      icon: 'hub',
      title: 'Multi-Plataforma',
      description: 'Meta Ads, TikTok Ads e WhatsApp Business integrados em um só lugar.',
    },
    {
      icon: 'psychology',
      title: 'Assistente de Marketing',
      description: 'A IA recomenda estratégias, público-alvo e orçamento ideal para seu negócio.',
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
      description: 'Alcance novos públicos com anúncios no TikTok gerados automaticamente.',
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

  scrollTo(id: string): void {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  ngOnDestroy(): void {
    if (!this.isBrowser) return;
    window.removeEventListener('scroll', this.scrollHandler);
    this.observer?.disconnect();
  }
}
