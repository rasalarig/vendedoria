import { Routes } from '@angular/router';
import { authGuard } from './services/auth.guard';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent) },
  { path: 'landing', loadComponent: () => import('./pages/landing/landing.component').then(m => m.LandingComponent) },
  { path: '', redirectTo: 'landing', pathMatch: 'full' },
  { path: 'home', loadComponent: () => import('./pages/home/home.component').then(m => m.HomeComponent), canActivate: [authGuard] },
  { path: 'sellers', loadComponent: () => import('./pages/sellers/sellers.component').then(m => m.SellersComponent), canActivate: [authGuard] },
  { path: 'sellers/create', loadComponent: () => import('./pages/sellers/seller-create.component').then(m => m.SellerCreateComponent), canActivate: [authGuard] },
  { path: 'vendas', loadComponent: () => import('./pages/vendas/vendas.component').then(m => m.VendasComponent), canActivate: [authGuard] },
  { path: 'vendas/nova', loadComponent: () => import('./pages/vendas/venda-create.component').then(m => m.VendaCreateComponent), canActivate: [authGuard] },
  { path: 'vendas/:id', loadComponent: () => import('./pages/vendas/venda-detail.component').then(m => m.VendaDetailComponent), canActivate: [authGuard] },
  { path: 'products/new', loadComponent: () => import('./pages/products/product-detail.component').then(m => m.ProductDetailComponent), canActivate: [authGuard] },
  { path: 'products/:id', loadComponent: () => import('./pages/products/product-detail.component').then(m => m.ProductDetailComponent), canActivate: [authGuard] },
  { path: 'products', loadComponent: () => import('./pages/products/products.component').then(m => m.ProductsComponent), canActivate: [authGuard] },
  { path: 'videos', loadComponent: () => import('./pages/videos/reference-videos.component').then(m => m.ReferenceVideosComponent), canActivate: [authGuard] },
  { path: 'wizard', loadComponent: () => import('./pages/wizard/wizard.component').then(m => m.WizardComponent), canActivate: [authGuard] },
  { path: 'chat', redirectTo: 'home', pathMatch: 'full' },
  { path: 'dashboard', loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent), canActivate: [authGuard] },
  { path: 'whatsapp', loadComponent: () => import('./pages/whatsapp/whatsapp.component').then(m => m.WhatsappComponent), canActivate: [authGuard] },
  { path: 'leads', loadComponent: () => import('./pages/leads/leads.component').then(m => m.LeadsComponent), canActivate: [authGuard] },
  { path: 'strategy', loadComponent: () => import('./pages/strategy/strategy.component').then(m => m.StrategyComponent), canActivate: [authGuard] },
  { path: 'analytics', loadComponent: () => import('./pages/analytics/analytics.component').then(m => m.AnalyticsComponent), canActivate: [authGuard] },
  { path: 'settings', loadComponent: () => import('./pages/settings/settings.component').then(m => m.SettingsComponent), canActivate: [authGuard] },
  { path: 'admin', loadComponent: () => import('./pages/admin/admin.component').then(m => m.AdminComponent), canActivate: [authGuard] },
];
