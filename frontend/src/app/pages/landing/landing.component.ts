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

    <!-- How It Works - Mind Map -->
    <section class="how-it-works section-animate" id="como-funciona">
      <div class="lp-container">
        <span class="section-badge">Como Funciona</span>
        <h2 class="section-title">Três pilares para<br/><span class="gradient-text">vender mais</span></h2>
        <p class="section-subtitle">Conheça o fluxo completo da plataforma — do cadastro ao resultado.</p>

        <div class="mindmap">
          <!-- Central hub -->
          <div class="mindmap-hub section-animate">
            <span class="hub-icon">&#x1F916;</span>
            <span class="hub-label">VendedorIA</span>
          </div>

          <div class="mindmap-branches">
            <!-- Branch 1: Produtos -->
            <div class="branch section-animate" style="--branch-color: #8b5cf6">
              <div class="branch-header">
                <div class="branch-icon-wrap"><mat-icon>inventory_2</mat-icon></div>
                <h3>Produtos</h3>
              </div>
              <div class="branch-items">
                <div class="branch-item">Cadastrar via Chat</div>
                <div class="branch-item">Editar e Remover</div>
                <div class="branch-item">Upload de Imagens</div>
                <div class="branch-item">URL do Site/Landing</div>
              </div>
            </div>

            <!-- Branch 2: Vendas & Campanhas -->
            <div class="branch branch-main section-animate" style="--branch-color: #ec4899">
              <div class="branch-header">
                <div class="branch-icon-wrap"><mat-icon>rocket_launch</mat-icon></div>
                <h3>Vendas &amp; Campanhas</h3>
              </div>
              <div class="branch-items">
                <div class="sub-group">
                  <span class="sub-label">Funil de Vendas</span>
                  <div class="branch-item"><span class="item-badge" style="background: #3b82f622; color: #3b82f6">Meta Ads</span> Facebook + Instagram</div>
                  <div class="branch-item"><span class="item-badge" style="background: #ec489922; color: #ec4899">TikTok</span> Anúncios em Vídeo</div>
                  <div class="branch-item"><span class="item-badge" style="background: #22c55e22; color: #22c55e">WhatsApp</span> Mensagens Diretas</div>
                </div>
                <div class="sub-group">
                  <span class="sub-label">Venda Direta</span>
                  <div class="branch-item">Criação Rápida de Campanha</div>
                  <div class="branch-item">Criativos Gerados por IA</div>
                </div>
              </div>
            </div>

            <!-- Branch 3: Acompanhamento -->
            <div class="branch section-animate" style="--branch-color: #3b82f6">
              <div class="branch-header">
                <div class="branch-icon-wrap"><mat-icon>monitoring</mat-icon></div>
                <h3>Acompanhamento</h3>
              </div>
              <div class="branch-items">
                <div class="branch-item">Dashboard de Métricas</div>
                <div class="branch-item">Impressões, Cliques, CTR</div>
                <div class="branch-item">ROI em Tempo Real</div>
                <div class="branch-item">Status de Campanhas</div>
              </div>
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

    /* ===== Mind Map ===== */
    .how-it-works {
      padding: 120px 0;
      text-align: center;
      background: rgba(24, 24, 27, 0.3);
    }

    .mindmap {
      margin-top: 20px;
    }

    .mindmap-hub {
      display: inline-flex;
      align-items: center;
      gap: 12px;
      padding: 16px 32px;
      border-radius: 100px;
      background: linear-gradient(135deg, rgba(139,92,246,0.2), rgba(236,72,153,0.2));
      border: 1px solid rgba(139,92,246,0.3);
      margin-bottom: 48px;
    }

    .hub-icon {
      font-size: 28px;
    }

    .hub-label {
      font-size: 20px;
      font-weight: 800;
      background: linear-gradient(135deg, #8b5cf6, #ec4899);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .mindmap-branches {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 24px;
      position: relative;
    }

    /* Connector line from hub to branches */
    .mindmap-branches::before {
      content: '';
      position: absolute;
      top: -24px;
      left: 50%;
      transform: translateX(-50%);
      width: 70%;
      height: 2px;
      background: linear-gradient(90deg, #8b5cf6, #ec4899, #3b82f6);
      opacity: 0.3;
    }

    .branch {
      text-align: left;
      border-radius: 16px;
      background: rgba(24, 24, 27, 0.6);
      border: 1px solid #27272a;
      overflow: hidden;
      transition: all 0.3s ease;
      backdrop-filter: blur(8px);
      position: relative;
    }

    .branch::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: var(--branch-color);
      opacity: 0.7;
    }

    .branch:hover {
      border-color: var(--branch-color);
      transform: translateY(-4px);
      box-shadow: 0 20px 40px -12px rgba(0,0,0,0.4);
    }

    .branch-header {
      padding: 28px 24px 16px;
      display: flex;
      align-items: center;
      gap: 14px;
    }

    .branch-icon-wrap {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: color-mix(in srgb, var(--branch-color) 15%, transparent);
      flex-shrink: 0;
    }

    .branch-icon-wrap mat-icon {
      color: var(--branch-color);
      font-size: 24px;
      width: 24px;
      height: 24px;
    }

    .branch-header h3 {
      font-size: 18px;
      font-weight: 700;
      margin: 0;
      color: #fafafa;
    }

    .branch-items {
      padding: 0 24px 24px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .branch-item {
      padding: 10px 14px;
      border-radius: 10px;
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.05);
      font-size: 14px;
      color: #a1a1aa;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .branch-item:hover {
      background: rgba(255,255,255,0.06);
      color: #e4e4e7;
    }

    .item-badge {
      padding: 2px 10px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
      flex-shrink: 0;
      letter-spacing: 0.3px;
    }

    .sub-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .sub-group + .sub-group {
      margin-top: 8px;
      padding-top: 12px;
      border-top: 1px solid rgba(255,255,255,0.05);
    }

    .sub-label {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #71717a;
      padding-left: 4px;
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

      .mindmap-branches {
        grid-template-columns: 1fr;
        gap: 16px;
      }

      .mindmap-branches::before {
        display: none;
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
