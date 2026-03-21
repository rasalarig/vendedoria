import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subscription, filter } from 'rxjs';
import { AuthService, AuthUser } from './services/auth.service';
import { ChatPanelComponent } from './components/chat-panel/chat-panel.component';

interface NavItem {
  path: string;
  label: string;
  icon: string;
  divider?: boolean;
}

interface JourneyStep {
  label: string;
  icon: string;
  path: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    ChatPanelComponent,
  ],
  template: `
    @if (isLoginPage) {
      <router-outlet></router-outlet>
    } @else {
      <div class="app-layout">
        <!-- Left nav sidebar -->
        <aside class="nav-sidebar" [class.collapsed]="sidebarCollapsed">
          <div class="brand-area">
            @if (!sidebarCollapsed) {
              <span class="brand-logo">VendedorIA</span>
              <span class="brand-badge">v2</span>
            }
            <button class="collapse-btn" (click)="toggleSidebar()"
                    [matTooltip]="sidebarCollapsed ? 'Expandir menu' : 'Recolher menu'"
                    matTooltipPosition="right">
              <mat-icon>{{ sidebarCollapsed ? 'menu' : 'menu_open' }}</mat-icon>
            </button>
          </div>

          @if (!sidebarCollapsed) {
            <div class="journey-progress">
              <div class="journey-label">Jornada</div>
              <div class="journey-steps">
                @for (step of journeySteps; track step.path; let i = $index) {
                  <div class="journey-step"
                       [class.completed]="i < currentJourneyStep"
                       [class.current]="i === currentJourneyStep"
                       [class.future]="i > currentJourneyStep"
                       [matTooltip]="step.label"
                       matTooltipPosition="above">
                    <div class="step-dot"></div>
                    @if (i < journeySteps.length - 1) {
                      <div class="step-connector"
                           [class.completed]="i < currentJourneyStep"></div>
                    }
                  </div>
                }
              </div>
              <div class="journey-labels">
                <span>{{ journeySteps[0].label }}</span>
                <span>{{ journeySteps[journeySteps.length - 1].label }}</span>
              </div>
            </div>
          }

          <nav class="nav-list">
            @for (item of navItems; track item.path) {
              @if (item.divider) {
                <div class="nav-divider"></div>
              }
              <a class="nav-item"
                 [routerLink]="item.path"
                 routerLinkActive="active-link"
                 [matTooltip]="sidebarCollapsed ? item.label : ''"
                 matTooltipPosition="right">
                <div class="nav-indicator"></div>
                <mat-icon>{{ item.icon }}</mat-icon>
                @if (!sidebarCollapsed) {
                  <span class="nav-label">{{ item.label }}</span>
                }
              </a>
            }
          </nav>

          <div class="sidebar-footer">
            @if (user) {
              <div class="user-area">
                <img [src]="user.avatar_url" class="user-avatar" referrerpolicy="no-referrer" />
                @if (!sidebarCollapsed) {
                  <span class="user-name">{{ user.name }}</span>
                }
                <button (click)="logout()" class="logout-btn"
                        [matTooltip]="sidebarCollapsed ? 'Sair' : ''"
                        matTooltipPosition="right"
                        title="Sair">
                  <mat-icon>logout</mat-icon>
                </button>
              </div>
            } @else {
              @if (!sidebarCollapsed) {
                <span class="version-tag">v2.0</span>
              }
            }
          </div>
        </aside>

        <!-- Main content -->
        <main class="main-content">
          <div class="main-content-inner">
            <router-outlet></router-outlet>
          </div>
        </main>

        <!-- Right chat sidebar (desktop) -->
        @if (!isMobileOverlay) {
          <aside class="chat-sidebar" [class.collapsed]="chatCollapsed">
            <div class="chat-toggle" (click)="toggleChat()">
              <mat-icon>{{ chatCollapsed ? 'smart_toy' : 'chevron_right' }}</mat-icon>
            </div>
            @if (!chatCollapsed) {
              <app-chat-panel (collapse)="toggleChat()"></app-chat-panel>
            } @else {
              <div class="chat-collapsed-icon" (click)="toggleChat()">
                <mat-icon>smart_toy</mat-icon>
              </div>
            }
          </aside>
        }

        <!-- Mobile: floating button + fullscreen overlay -->
        @if (isMobileOverlay) {
          @if (!mobileChatOpen) {
            <button class="mobile-chat-fab" (click)="toggleMobileChat()">
              <mat-icon>smart_toy</mat-icon>
            </button>
          }
          @if (mobileChatOpen) {
            <div class="mobile-chat-overlay">
              <app-chat-panel (collapse)="toggleMobileChat()"></app-chat-panel>
            </div>
          }
        }
      </div>
    }
  `,
  styles: [`
    /* 3-panel layout */
    .app-layout {
      display: flex;
      height: 100vh;
      overflow: hidden;
      position: relative;
    }

    /* Left nav sidebar */
    .nav-sidebar {
      width: 240px;
      min-width: 240px;
      background: #09090b;
      border-right: 1px solid #27272a;
      display: flex;
      flex-direction: column;
      transition: width 0.25s cubic-bezier(0.4, 0, 0.2, 1),
                  min-width 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      overflow-x: hidden;
      overflow-y: hidden;
      flex-shrink: 0;

      &.collapsed {
        width: 64px;
        min-width: 64px;
      }
    }

    .brand-area {
      padding: 20px 16px;
      display: flex;
      align-items: center;
      gap: 8px;
      border-bottom: 1px solid #27272a;
      min-height: 64px;
      box-sizing: border-box;
    }

    .brand-logo {
      font-size: 20px;
      font-weight: 800;
      letter-spacing: -0.5px;
      background: linear-gradient(135deg, #8b5cf6, #ec4899);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      white-space: nowrap;
    }

    .brand-badge {
      font-size: 11px;
      font-weight: 600;
      background: rgba(139, 92, 246, 0.15);
      color: #a78bfa;
      padding: 2px 8px;
      border-radius: 6px;
      letter-spacing: 0.5px;
      white-space: nowrap;
    }

    .collapse-btn {
      margin-left: auto;
      background: none;
      border: none;
      cursor: pointer;
      padding: 6px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.15s ease;
      flex-shrink: 0;

      mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
        color: #71717a;
        transition: color 0.15s ease;
      }

      &:hover {
        background: rgba(139, 92, 246, 0.1);

        mat-icon {
          color: #a1a1aa;
        }
      }
    }

    /* Journey Progress */
    .journey-progress {
      padding: 16px 16px 12px;
      border-bottom: 1px solid #27272a;
    }

    .journey-label {
      font-size: 11px;
      font-weight: 600;
      color: #52525b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 10px;
    }

    .journey-steps {
      display: flex;
      align-items: center;
      padding: 0 4px;
    }

    .journey-step {
      display: flex;
      align-items: center;
      flex: 1;

      &:last-child {
        flex: 0;
      }
    }

    .step-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #27272a;
      border: 2px solid #3f3f46;
      flex-shrink: 0;
      transition: all 0.3s ease;
    }

    .journey-step.completed .step-dot {
      background: #22c55e;
      border-color: #22c55e;
    }

    .journey-step.current .step-dot {
      background: #8b5cf6;
      border-color: #8b5cf6;
      animation: pulse-dot 2s infinite;
    }

    .step-connector {
      flex: 1;
      height: 2px;
      background: #27272a;
      margin: 0 2px;
      transition: background 0.3s ease;
    }

    .step-connector.completed {
      background: #22c55e;
    }

    .journey-labels {
      display: flex;
      justify-content: space-between;
      margin-top: 6px;
      font-size: 10px;
      color: #52525b;
    }

    @keyframes pulse-dot {
      0%, 100% { box-shadow: 0 0 0 0 rgba(139, 92, 246, 0.4); }
      50% { box-shadow: 0 0 0 6px rgba(139, 92, 246, 0); }
    }

    /* Nav */
    .nav-list {
      flex: 1;
      padding: 12px 8px;
      display: flex;
      flex-direction: column;
      gap: 2px;
      overflow-y: auto;
    }

    .nav-divider {
      height: 1px;
      background: #27272a;
      margin: 8px 12px;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 16px;
      border-radius: 10px;
      color: #a1a1aa;
      text-decoration: none;
      font-size: 14px;
      font-weight: 500;
      transition: all 0.15s ease;
      position: relative;
      cursor: pointer;
      white-space: nowrap;

      mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
        color: #71717a;
        transition: color 0.15s ease;
        flex-shrink: 0;
      }

      .nav-indicator {
        position: absolute;
        left: 0;
        top: 50%;
        transform: translateY(-50%);
        width: 3px;
        height: 0;
        background: #8b5cf6;
        border-radius: 0 2px 2px 0;
        transition: height 0.2s ease;
      }

      .nav-label {
        overflow: hidden;
        text-overflow: ellipsis;
      }

      &:hover {
        background: rgba(139, 92, 246, 0.06);
        color: #fafafa;

        mat-icon {
          color: #a1a1aa;
        }
      }

      &.active-link {
        background: rgba(139, 92, 246, 0.1);
        color: #fafafa;

        mat-icon {
          color: #8b5cf6;
        }

        .nav-indicator {
          height: 20px;
        }
      }
    }

    .sidebar-footer {
      padding: 16px;
      border-top: 1px solid #27272a;
    }

    .version-tag {
      font-size: 12px;
      color: #52525b;
      font-weight: 500;
    }

    .user-area {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .user-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      object-fit: cover;
      border: 1px solid #27272a;
      flex-shrink: 0;
    }

    .user-name {
      flex: 1;
      font-size: 13px;
      color: #a1a1aa;
      font-weight: 500;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .logout-btn {
      background: none;
      border: none;
      cursor: pointer;
      padding: 4px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.15s ease;
      flex-shrink: 0;

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
        color: #52525b;
      }

      &:hover {
        background: rgba(239, 68, 68, 0.1);

        mat-icon {
          color: #ef4444;
        }
      }
    }

    /* Main content */
    .main-content {
      flex: 1;
      overflow-y: auto;
      background: #09090b;
      min-width: 0;
    }

    .main-content-inner {
      max-width: 1440px;
      margin: 0 auto;
    }

    /* Right chat sidebar */
    .chat-sidebar {
      width: 380px;
      min-width: 380px;
      height: 100vh;
      background: #0a0a0f;
      border-left: 1px solid #27272a;
      display: flex;
      flex-direction: column;
      transition: width 0.2s ease, min-width 0.2s ease;
      position: relative;
      flex-shrink: 0;

      &.collapsed {
        width: 48px;
        min-width: 48px;
      }
    }

    .chat-toggle {
      position: absolute;
      left: -16px;
      top: 50%;
      transform: translateY(-50%);
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: #18181b;
      border: 1px solid #27272a;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      z-index: 10;
      transition: background 0.15s, border-color 0.15s;

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
        color: #71717a;
        transition: color 0.15s;
      }

      &:hover {
        background: #27272a;
        border-color: #8b5cf6;

        mat-icon {
          color: #a1a1aa;
        }
      }
    }

    .chat-collapsed-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      cursor: pointer;

      mat-icon {
        font-size: 24px;
        width: 24px;
        height: 24px;
        color: #52525b;
        transition: color 0.15s;
      }

      &:hover mat-icon {
        color: #8b5cf6;
      }
    }

    /* Mobile floating button */
    .mobile-chat-fab {
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      border: none;
      background: linear-gradient(135deg, #8b5cf6, #ec4899);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 4px 20px rgba(139, 92, 246, 0.4);
      z-index: 1000;
      transition: transform 0.2s, box-shadow 0.2s;

      mat-icon {
        font-size: 28px;
        width: 28px;
        height: 28px;
      }

      &:hover {
        transform: scale(1.08);
        box-shadow: 0 6px 28px rgba(139, 92, 246, 0.5);
      }
    }

    /* Mobile fullscreen overlay */
    .mobile-chat-overlay {
      position: fixed;
      inset: 0;
      z-index: 1000;
      background: #0a0a0f;
    }

    /* Responsive */
    @media (max-width: 1023px) {
      .chat-sidebar {
        /* Below 1024 starts collapsed — handled by code */
      }
    }

    @media (max-width: 767px) {
      .nav-sidebar {
        width: 64px;
        min-width: 64px;
      }

      .chat-sidebar {
        display: none;
      }
    }
  `],
})
export class AppComponent implements OnInit, OnDestroy {
  isLoginPage = false;
  user: AuthUser | null = null;
  sidebarCollapsed = false;
  chatCollapsed = false;
  isMobileOverlay = false;
  mobileChatOpen = false;

  private routerSub!: Subscription;
  private userSub!: Subscription;

  navItems: NavItem[] = [
    { path: 'home', label: 'Inicio', icon: 'home' },
    { path: 'sellers', label: 'Vendedores', icon: 'face' },
    { path: 'products', label: 'Produtos', icon: 'inventory_2' },
    { path: 'videos', label: 'Videos', icon: 'video_library' },
    { path: 'creatives', label: 'Criativos', icon: 'movie_creation' },
    { path: 'campaigns', label: 'Campanhas', icon: 'rocket_launch' },
    { path: 'dashboard', label: 'Metricas', icon: 'monitoring', divider: true },
    { path: 'settings', label: 'Configuracoes', icon: 'settings' },
  ];

  journeySteps: JourneyStep[] = [
    { label: 'Vendedor', icon: 'face', path: 'sellers' },
    { label: 'Produto', icon: 'inventory_2', path: 'products' },
    { label: 'Video', icon: 'video_library', path: 'videos' },
    { label: 'Criativo', icon: 'movie_creation', path: 'creatives' },
    { label: 'Campanha', icon: 'rocket_launch', path: 'campaigns' },
  ];

  currentJourneyStep = 0;

  constructor(
    private authService: AuthService,
    private router: Router,
  ) {
    // Restore sidebar collapsed state
    const stored = localStorage.getItem('sidebar_collapsed');
    if (stored !== null) {
      this.sidebarCollapsed = stored === 'true';
    }

    // Restore chat collapsed state
    const chatStored = localStorage.getItem('vendedoria_chat_collapsed');
    if (chatStored !== null) {
      this.chatCollapsed = chatStored === 'true';
    }

    // Check responsive on init
    this.checkResponsive();
  }

  ngOnInit(): void {
    this.userSub = this.authService.user$.subscribe(u => this.user = u);

    this.routerSub = this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e) => {
        this.isLoginPage = (e as NavigationEnd).urlAfterRedirects === '/login';
      });

    // Check initial URL
    this.isLoginPage = this.router.url === '/login';
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
    this.userSub?.unsubscribe();
  }

  @HostListener('window:resize')
  onResize(): void {
    this.checkResponsive();
  }

  private checkResponsive(): void {
    const width = window.innerWidth;
    this.isMobileOverlay = width < 768;

    // On medium screens, default chat to collapsed if no explicit preference was saved
    if (width < 1024 && width >= 768) {
      const chatStored = localStorage.getItem('vendedoria_chat_collapsed');
      if (chatStored === null) {
        this.chatCollapsed = true;
      }
    }
  }

  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
    localStorage.setItem('sidebar_collapsed', String(this.sidebarCollapsed));
  }

  toggleChat(): void {
    this.chatCollapsed = !this.chatCollapsed;
    localStorage.setItem('vendedoria_chat_collapsed', String(this.chatCollapsed));
  }

  toggleMobileChat(): void {
    this.mobileChatOpen = !this.mobileChatOpen;
  }

  logout(): void {
    this.authService.logout();
  }
}
