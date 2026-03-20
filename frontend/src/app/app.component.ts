import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { Subscription, filter } from 'rxjs';
import { AuthService, AuthUser } from './services/auth.service';

interface NavItem {
  path: string;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatSidenavModule,
    MatToolbarModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
  ],
  template: `
    @if (isLoginPage) {
      <router-outlet></router-outlet>
    } @else {
      <mat-sidenav-container class="app-container">
        <mat-sidenav mode="side" opened class="app-sidenav">
          <div class="brand-area">
            <span class="brand-logo">VendedorIA</span>
            <span class="brand-badge">2026</span>
          </div>

          <nav class="nav-list">
            @for (item of navItems; track item.path) {
              <a class="nav-item"
                 [routerLink]="item.path"
                 routerLinkActive="active-link">
                <div class="nav-indicator"></div>
                <mat-icon>{{ item.icon }}</mat-icon>
                <span class="nav-label">{{ item.label }}</span>
              </a>
            }
          </nav>

          <div class="sidebar-footer">
            @if (user) {
              <div class="user-area">
                <img [src]="user.avatar_url" class="user-avatar" referrerpolicy="no-referrer" />
                <span class="user-name">{{ user.name }}</span>
                <button (click)="logout()" class="logout-btn" title="Sair">
                  <mat-icon>logout</mat-icon>
                </button>
              </div>
            } @else {
              <span class="version-tag">v1.0</span>
            }
          </div>
        </mat-sidenav>

        <mat-sidenav-content class="app-content">
          <div class="main-content">
            <router-outlet></router-outlet>
          </div>
        </mat-sidenav-content>
      </mat-sidenav-container>
    }
  `,
  styles: [`
    .app-container {
      height: 100vh;
    }

    .app-sidenav {
      width: 240px;
      background: #09090b !important;
      border-right: 1px solid #27272a !important;
      display: flex;
      flex-direction: column;
    }

    .brand-area {
      padding: 28px 24px 24px;
      display: flex;
      align-items: center;
      gap: 8px;
      border-bottom: 1px solid #27272a;
    }

    .brand-logo {
      font-size: 20px;
      font-weight: 800;
      letter-spacing: -0.5px;
      background: linear-gradient(135deg, #8b5cf6, #ec4899);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .brand-badge {
      font-size: 11px;
      font-weight: 600;
      background: rgba(139, 92, 246, 0.15);
      color: #a78bfa;
      padding: 2px 8px;
      border-radius: 6px;
      letter-spacing: 0.5px;
    }

    .nav-list {
      flex: 1;
      padding: 12px 8px;
      display: flex;
      flex-direction: column;
      gap: 2px;
      overflow-y: auto;
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

      mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
        color: #71717a;
        transition: color 0.15s ease;
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
      padding: 16px 24px;
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

    .app-content {
      background: #09090b;
    }

    .main-content {
      max-width: 1440px;
      margin: 0 auto;
    }
  `],
})
export class AppComponent implements OnInit, OnDestroy {
  isLoginPage = false;
  user: AuthUser | null = null;

  private routerSub!: Subscription;
  private userSub!: Subscription;

  navItems: NavItem[] = [
    { path: 'chat', label: 'Chat IA', icon: 'smart_toy' },
    { path: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    { path: 'products', label: 'Produtos', icon: 'shopping_cart' },
    { path: 'creatives', label: 'Criativos', icon: 'brush' },
    { path: 'campaigns', label: 'Campanhas', icon: 'campaign' },
    { path: 'whatsapp', label: 'WhatsApp', icon: 'chat' },
    { path: 'leads', label: 'Leads', icon: 'people' },
    { path: 'strategy', label: 'Estrategia', icon: 'psychology' },
    { path: 'analytics', label: 'Analytics', icon: 'analytics' },
    { path: 'settings', label: 'Configuracoes', icon: 'settings' },
  ];

  constructor(
    private authService: AuthService,
    private router: Router,
  ) {}

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

  logout(): void {
    this.authService.logout();
  }
}
