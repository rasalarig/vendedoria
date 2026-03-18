import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'chat', pathMatch: 'full' },
  { path: 'chat', loadComponent: () => import('./pages/chat/chat.component').then(m => m.ChatComponent) },
  { path: 'dashboard', loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent) },
  { path: 'products', loadComponent: () => import('./pages/products/products.component').then(m => m.ProductsComponent) },
  { path: 'creatives', loadComponent: () => import('./pages/creatives/creatives.component').then(m => m.CreativesComponent) },
  { path: 'campaigns', loadComponent: () => import('./pages/campaigns/campaigns.component').then(m => m.CampaignsComponent) },
  { path: 'whatsapp', loadComponent: () => import('./pages/whatsapp/whatsapp.component').then(m => m.WhatsappComponent) },
  { path: 'leads', loadComponent: () => import('./pages/leads/leads.component').then(m => m.LeadsComponent) },
  { path: 'strategy', loadComponent: () => import('./pages/strategy/strategy.component').then(m => m.StrategyComponent) },
  { path: 'analytics', loadComponent: () => import('./pages/analytics/analytics.component').then(m => m.AnalyticsComponent) },
  { path: 'settings', loadComponent: () => import('./pages/settings/settings.component').then(m => m.SettingsComponent) },
];
