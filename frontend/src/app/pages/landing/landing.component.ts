import { Component, OnInit, OnDestroy, PLATFORM_ID, Inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { I18nService } from '../../services/i18n.service';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule, MatButtonModule],
  template: `
    <!-- Sticky Header -->
    <header class="lp-header" [class.scrolled]="scrolled">
      <div class="lp-container header-inner">
        <a routerLink="/landing" class="brand-logo">VendedorIA</a>
        <div style="display: flex; align-items: center; gap: 12px;">
          <div class="lang-selector">
            <button class="lang-btn" [class.active]="i18n.currentLang === 'pt'" (click)="i18n.setLang('pt')" title="Portugues (BR)">PT</button>
            <button class="lang-btn" [class.active]="i18n.currentLang === 'en'" (click)="i18n.setLang('en')" title="English (US)">EN</button>
          </div>
          <a routerLink="/login" class="btn-enter">{{ i18n.t('landing.enter') }}</a>
        </div>
      </div>
    </header>

    <!-- Hero Section -->
    <section class="hero">
      <div class="hero-glow hero-glow--left"></div>
      <div class="hero-glow hero-glow--right"></div>
      <div class="lp-container hero-inner">
        <span class="hero-badge">{{ i18n.t('landing.heroBadge') }}</span>
        <h1 class="hero-title">
          {{ i18n.t('landing.heroTitle1') }}<br/>
          <span class="gradient-text">{{ i18n.t('landing.heroTitle2') }}</span>
        </h1>
        <p class="hero-subtitle">
          {{ i18n.t('landing.heroSubtitle') }}
        </p>
        <div class="hero-actions">
          <a routerLink="/login" class="btn-primary btn-lg">
            {{ i18n.t('landing.startFree') }}
            <mat-icon>arrow_forward</mat-icon>
          </a>
          <a (click)="scrollTo('como-funciona')" class="btn-ghost btn-lg" style="cursor:pointer">
            {{ i18n.t('landing.howItWorks') }}
            <mat-icon>expand_more</mat-icon>
          </a>
        </div>
        <div class="hero-metrics">
          <div class="metric-item">
            <span class="metric-value">100%</span>
            <span class="metric-label">{{ i18n.t('landing.automated') }}</span>
          </div>
          <div class="metric-divider"></div>
          <div class="metric-item">
            <span class="metric-value">3</span>
            <span class="metric-label">{{ i18n.t('landing.platforms') }}</span>
          </div>
          <div class="metric-divider"></div>
          <div class="metric-item">
            <span class="metric-value">IA</span>
            <span class="metric-label">{{ i18n.t('landing.generativeAI') }}</span>
          </div>
        </div>
      </div>
    </section>

    <!-- Benefits Section -->
    <section class="benefits section-animate" id="beneficios">
      <div class="lp-container">
        <span class="section-badge">{{ i18n.t('landing.resources') }}</span>
        <h2 class="section-title">{{ i18n.t('landing.benefitsTitle1') }}<br/><span class="gradient-text">{{ i18n.t('landing.benefitsTitle2') }}</span></h2>
        <p class="section-subtitle">{{ i18n.t('landing.benefitsSubtitle') }}</p>
        <div class="benefits-grid">
          @for (benefit of benefits; track benefit.titleKey) {
            <div class="benefit-card section-animate">
              <div class="benefit-icon-wrap">
                <mat-icon>{{ benefit.icon }}</mat-icon>
              </div>
              <h3>{{ i18n.t(benefit.titleKey) }}</h3>
              <p>{{ i18n.t(benefit.descKey) }}</p>
            </div>
          }
        </div>
      </div>
    </section>

    <!-- How It Works - Journey Timeline -->
    <section class="journey-section section-animate" id="como-funciona">
      <div class="lp-container">
        <span class="section-badge">{{ i18n.t('landing.howItWorksLabel') }}</span>
        <h2 class="section-title">{{ i18n.t('landing.journeyTitle1') }}<br/><span class="gradient-text">{{ i18n.t('landing.journeyTitle2') }}</span></h2>
        <p class="section-subtitle">{{ i18n.t('landing.journeySubtitle') }}</p>

        <div class="journey-timeline">
          <!-- Timeline vertical line -->
          <div class="journey-line"></div>

          <!-- Step 1 -->
          <div class="journey-step section-animate" style="--step-color: #8b5cf6">
            <div class="journey-marker">
              <span class="journey-number">1</span>
            </div>
            <div class="journey-card">
              <div class="journey-card-header">
                <mat-icon>inventory_2</mat-icon>
                <h3>{{ i18n.t('landing.step1Title') }}</h3>
              </div>
              <p class="journey-card-desc">{{ i18n.t('landing.step1Desc') }}</p>
              <ul class="journey-subitems">
                <li class="journey-subitem section-animate">
                  <mat-icon>smart_toy</mat-icon>
                  <span>{{ i18n.t('landing.step1Sub1') }}</span>
                  <span class="journey-badge" style="--badge-color: #8b5cf6">{{ i18n.t('landing.step1Badge1') }}</span>
                </li>
                <li class="journey-subitem section-animate">
                  <mat-icon>photo_library</mat-icon>
                  <span>{{ i18n.t('landing.step1Sub2') }}</span>
                </li>
                <li class="journey-subitem section-animate">
                  <mat-icon>link</mat-icon>
                  <span>{{ i18n.t('landing.step1Sub3') }}</span>
                </li>
              </ul>
            </div>
          </div>

          <!-- Step 2 -->
          <div class="journey-step section-animate" style="--step-color: #3b82f6">
            <div class="journey-marker">
              <span class="journey-number">2</span>
            </div>
            <div class="journey-card">
              <div class="journey-card-header">
                <mat-icon>hub</mat-icon>
                <h3>{{ i18n.t('landing.step2Title') }}</h3>
              </div>
              <p class="journey-card-desc">{{ i18n.t('landing.step2Desc') }}</p>
              <ul class="journey-subitems">
                <li class="journey-subitem section-animate">
                  <mat-icon>campaign</mat-icon>
                  <span>Facebook + Instagram</span>
                  <span class="journey-badge" style="--badge-color: #3b82f6">Meta Ads</span>
                </li>
                <li class="journey-subitem section-animate">
                  <mat-icon>play_circle</mat-icon>
                  <span>TikTok</span>
                  <span class="journey-badge" style="--badge-color: #ec4899">{{ i18n.t('common.comingSoon') }}</span>
                </li>
                <li class="journey-subitem section-animate">
                  <mat-icon>forum</mat-icon>
                  <span>WhatsApp</span>
                  <span class="journey-badge" style="--badge-color: #22c55e">{{ i18n.t('common.comingSoon') }}</span>
                </li>
              </ul>
            </div>
          </div>

          <!-- Step 3 -->
          <div class="journey-step section-animate" style="--step-color: #ec4899">
            <div class="journey-marker">
              <span class="journey-number">3</span>
            </div>
            <div class="journey-card">
              <div class="journey-card-header">
                <mat-icon>auto_awesome</mat-icon>
                <h3>{{ i18n.t('landing.step3Title') }}</h3>
              </div>
              <p class="journey-card-desc">{{ i18n.t('landing.step3Desc') }}</p>
              <ul class="journey-subitems">
                <li class="journey-subitem section-animate">
                  <mat-icon>palette</mat-icon>
                  <span>{{ i18n.t('landing.step3Sub1') }}</span>
                  <span class="journey-badge" style="--badge-color: #ec4899">{{ i18n.t('landing.step3Badge1') }}</span>
                </li>
                <li class="journey-subitem section-animate">
                  <mat-icon>videocam</mat-icon>
                  <span>{{ i18n.t('landing.step3Sub2') }}</span>
                  <span class="journey-badge" style="--badge-color: #8b5cf6">{{ i18n.t('landing.step3Badge2') }}</span>
                </li>
                <li class="journey-subitem section-animate">
                  <mat-icon>edit_note</mat-icon>
                  <span>{{ i18n.t('landing.step3Sub3') }}</span>
                </li>
                <li class="journey-subitem section-animate">
                  <mat-icon>groups</mat-icon>
                  <span>{{ i18n.t('landing.step3Sub4') }}</span>
                </li>
              </ul>
            </div>
          </div>

          <!-- Step 4 -->
          <div class="journey-step section-animate" style="--step-color: #10b981">
            <div class="journey-marker">
              <span class="journey-number">4</span>
            </div>
            <div class="journey-card">
              <div class="journey-card-header">
                <mat-icon>monitoring</mat-icon>
                <h3>{{ i18n.t('landing.step4Title') }}</h3>
              </div>
              <p class="journey-card-desc">{{ i18n.t('landing.step4Desc') }}</p>
              <ul class="journey-subitems">
                <li class="journey-subitem section-animate">
                  <mat-icon>visibility</mat-icon>
                  <span>{{ i18n.t('landing.step4Sub1') }}</span>
                </li>
                <li class="journey-subitem section-animate">
                  <mat-icon>trending_up</mat-icon>
                  <span>{{ i18n.t('landing.step4Sub2') }}</span>
                  <span class="journey-badge" style="--badge-color: #10b981">{{ i18n.t('landing.step4Badge2') }}</span>
                </li>
                <li class="journey-subitem section-animate">
                  <mat-icon>radio_button_checked</mat-icon>
                  <span>{{ i18n.t('landing.step4Sub3') }}</span>
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
        <span class="section-badge">{{ i18n.t('landing.integrations') }}</span>
        <h2 class="section-title">{{ i18n.t('landing.multiPlatformTitle1') }}<br/><span class="gradient-text">{{ i18n.t('landing.multiPlatformTitle2') }}</span></h2>
        <p class="section-subtitle">{{ i18n.t('landing.multiPlatformSubtitle') }}</p>
        <div class="platforms-grid">
          @for (platform of platforms; track platform.name) {
            <div class="platform-card section-animate" [style.--accent]="platform.color">
              <span class="platform-emoji">{{ platform.emoji }}</span>
              <h3>{{ platform.name }}</h3>
              <p>{{ i18n.t(platform.descKey) }}</p>
              <span class="platform-badge" [style.background]="platform.color + '22'" [style.color]="platform.color">
                {{ i18n.t('landing.integrated') }}
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
        <h2>{{ i18n.t('landing.ctaTitle1') }}<br/><span class="gradient-text">{{ i18n.t('landing.ctaTitle2') }}</span></h2>
        <p>{{ i18n.t('landing.ctaSubtitle') }}</p>
        <a routerLink="/login" class="btn-primary btn-lg">
          {{ i18n.t('landing.ctaButton') }}
          <mat-icon>arrow_forward</mat-icon>
        </a>
      </div>
    </section>

    <!-- Footer -->
    <footer class="lp-footer">
      <div class="lp-container footer-inner">
        <div class="footer-brand">
          <span class="brand-logo">VendedorIA</span>
          <p>{{ i18n.t('landing.footerDesc') }}</p>
        </div>
        <p class="copyright">{{ i18n.t('landing.copyright') }}</p>
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

    .lang-selector {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .lang-btn {
      background: #27272a;
      border: 1px solid #3f3f46;
      border-radius: 20px;
      cursor: pointer;
      font-size: 11px;
      font-weight: 600;
      line-height: 1;
      padding: 5px 10px;
      color: #a1a1aa;
      transition: background 0.2s, color 0.2s, border-color 0.2s;
    }
    .lang-btn:hover {
      background: #3f3f46;
      color: #fafafa;
    }
    .lang-btn.active {
      background: #8b5cf6;
      color: #fff;
      border-color: #8b5cf6;
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

    /* ===== Journey Timeline ===== */
    .journey-section {
      padding: 120px 0;
      text-align: center;
      background: rgba(24, 24, 27, 0.3);
    }

    .journey-timeline {
      position: relative;
      display: flex;
      flex-direction: column;
      gap: 40px;
      margin-top: 20px;
      padding-left: 80px;
      text-align: left;
    }

    /* Vertical gradient line */
    .journey-line {
      position: absolute;
      top: 0;
      left: 23px;
      width: 2px;
      height: 100%;
      background: linear-gradient(180deg, #8b5cf6 0%, #3b82f6 33%, #ec4899 66%, #10b981 100%);
      opacity: 0.5;
    }

    /* Step row */
    .journey-step {
      position: relative;
      display: flex;
      align-items: flex-start;
    }

    /* Numbered circle on the timeline */
    .journey-marker {
      position: absolute;
      left: -56px;
      top: 24px;
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: var(--step-color);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 24px color-mix(in srgb, var(--step-color) 40%, transparent);
      z-index: 2;
      flex-shrink: 0;
    }

    .journey-number {
      font-size: 20px;
      font-weight: 800;
      color: #fff;
      line-height: 1;
    }

    /* Card */
    .journey-card {
      flex: 1;
      padding: 28px 32px;
      border-radius: 16px;
      background: rgba(24, 24, 27, 0.6);
      border: 1px solid #27272a;
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      transition: all 0.35s ease;
    }

    .journey-card:hover {
      transform: translateY(-4px);
      border-color: color-mix(in srgb, var(--step-color) 50%, transparent);
      box-shadow: 0 20px 48px -12px rgba(0,0,0,0.5), 0 0 32px color-mix(in srgb, var(--step-color) 12%, transparent);
    }

    .journey-card-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 6px;
    }

    .journey-card-header mat-icon {
      color: var(--step-color);
      font-size: 28px;
      width: 28px;
      height: 28px;
    }

    .journey-card-header h3 {
      font-size: 20px;
      font-weight: 700;
      color: #fff;
      margin: 0;
    }

    .journey-card-desc {
      font-size: 14px;
      color: #a1a1aa;
      line-height: 1.6;
      margin: 0 0 18px;
    }

    /* Sub-items list */
    .journey-subitems {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .journey-subitem {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 14px;
      border-radius: 10px;
      border-left: 3px solid color-mix(in srgb, var(--step-color) 40%, transparent);
      background: rgba(255,255,255,0.02);
      transition: all 0.25s ease;
    }

    .journey-subitem:hover {
      background: rgba(255,255,255,0.05);
      border-left-color: var(--step-color);
      transform: translateX(4px);
    }

    .journey-subitem mat-icon {
      color: #71717a;
      font-size: 18px;
      width: 18px;
      height: 18px;
      flex-shrink: 0;
      transition: color 0.25s ease;
    }

    .journey-subitem:hover mat-icon {
      color: var(--step-color);
    }

    .journey-subitem span {
      font-size: 14px;
      color: #d4d4d8;
      line-height: 1.4;
    }

    /* Badge / pill */
    .journey-badge {
      display: inline-block;
      padding: 2px 10px;
      border-radius: 100px;
      font-size: 11px !important;
      font-weight: 600;
      color: var(--badge-color) !important;
      background: color-mix(in srgb, var(--badge-color) 15%, transparent);
      margin-left: auto;
      white-space: nowrap;
      flex-shrink: 0;
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

      .journey-timeline {
        padding-left: 60px;
        gap: 28px;
      }

      .journey-marker {
        left: -48px;
        width: 36px;
        height: 36px;
        top: 18px;
      }

      .journey-number {
        font-size: 16px;
      }

      .journey-line {
        left: 14px;
      }

      .journey-card {
        padding: 20px 18px;
      }

      .journey-card-header h3 {
        font-size: 17px;
      }

      .journey-card-header mat-icon {
        font-size: 22px;
        width: 22px;
        height: 22px;
      }

      .journey-card-desc {
        font-size: 13px;
      }

      .journey-subitem {
        padding: 8px 10px;
      }

      .journey-subitem span {
        font-size: 13px;
      }

      .journey-badge {
        font-size: 10px !important;
        padding: 2px 8px;
      }

      .benefits, .journey-section, .platforms, .final-cta {
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
    { icon: 'inventory_2', titleKey: 'landing.benefit1Title', descKey: 'landing.benefit1Desc' },
    { icon: 'campaign', titleKey: 'landing.benefit2Title', descKey: 'landing.benefit2Desc' },
    { icon: 'auto_awesome', titleKey: 'landing.benefit3Title', descKey: 'landing.benefit3Desc' },
    { icon: 'analytics', titleKey: 'landing.benefit4Title', descKey: 'landing.benefit4Desc' },
    { icon: 'hub', titleKey: 'landing.benefit5Title', descKey: 'landing.benefit5Desc' },
    { icon: 'psychology', titleKey: 'landing.benefit6Title', descKey: 'landing.benefit6Desc' },
  ];

  platforms = [
    { name: 'Meta Ads', emoji: '\uD83D\uDCF1', descKey: 'landing.platformMetaDesc', color: '#3b82f6' },
    { name: 'TikTok Ads', emoji: '\uD83C\uDFB5', descKey: 'landing.platformTikTokDesc', color: '#ec4899' },
    { name: 'WhatsApp Business', emoji: '\uD83D\uDCAC', descKey: 'landing.platformWhatsAppDesc', color: '#22c55e' },
  ];

  private scrollHandler = () => {
    this.scrolled = window.scrollY > 20;
  };

  constructor(@Inject(PLATFORM_ID) platformId: Object, public i18n: I18nService) {
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
