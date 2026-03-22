import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { ApiService } from '../../services/api.service';

interface DashboardMetrics {
  total_spent: number;
  total_impressions: number;
  total_clicks: number;
  roi: number;
  ctr: number;
  active_campaigns: number;
  total_leads: number;
  total_conversions: number;
}

interface CampaignRow {
  id: number;
  name: string;
  platform: string;
  status: string;
  daily_budget: number;
  impressions: number;
  clicks: number;
  ctr: number;
  spent: number;
  product_name: string;
}

interface TopCreative {
  id: number;
  headline: string;
  image_url: string;
  product_name: string;
  ctr: number;
  clicks: number;
}

interface TopProduct {
  id: number;
  name: string;
  image_url: string;
  clicks: number;
}

interface DashboardData {
  metrics: DashboardMetrics;
  campaigns: CampaignRow[];
  chart_data: {
    labels: string[];
    impressions: number[];
    clicks: number[];
    spent: number[];
    ctr: number[];
  };
  top_creatives: TopCreative[];
  top_products: TopProduct[];
  recent_activities: { type: string; message: string; time: string }[];
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatListModule,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  metrics: DashboardMetrics = {
    total_spent: 0,
    total_impressions: 0,
    total_clicks: 0,
    roi: 0,
    ctr: 0,
    active_campaigns: 0,
    total_leads: 0,
    total_conversions: 0,
  };

  campaigns: CampaignRow[] = [];
  topCreatives: TopCreative[] = [];
  topProducts: TopProduct[] = [];
  recentActivities: { type: string; message: string; time: string }[] = [];

  chartData: any = null;
  activeChartTab: 'impressions' | 'clicks' | 'spent' | 'ctr' = 'impressions';
  selectedPeriod: '7' | '14' | '30' = '7';

  loading = true;

  constructor(
    private router: Router,
    private apiService: ApiService,
  ) {}

  ngOnInit(): void {
    this.loadDashboard();
  }

  loadDashboard(): void {
    this.loading = true;
    this.apiService.get<DashboardData>('/dashboard').subscribe({
      next: (data) => {
        this.metrics = data.metrics;
        this.campaigns = data.campaigns || [];
        this.topCreatives = data.top_creatives || [];
        this.topProducts = data.top_products || [];
        this.recentActivities = data.recent_activities || [];
        this.chartData = data.chart_data;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  getChartValues(): number[] {
    if (!this.chartData) return [];
    return this.chartData[this.activeChartTab] || [];
  }

  getChartMax(): number {
    const vals = this.getChartValues();
    const max = Math.max(...vals, 1);
    return max;
  }

  getBarHeight(value: number): number {
    const max = this.getChartMax();
    return max > 0 ? (value / max) * 100 : 0;
  }

  setChartTab(tab: 'impressions' | 'clicks' | 'spent' | 'ctr'): void {
    this.activeChartTab = tab;
  }

  setPeriod(period: '7' | '14' | '30'): void {
    this.selectedPeriod = period;
    // In the future, reload data filtered by period
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      active: 'Ativo',
      ACTIVE: 'Ativo',
      published: 'Ativo',
      paused: 'Pausado',
      PAUSED: 'Pausado',
      draft: 'Rascunho',
      completed: 'Finalizado',
    };
    return labels[status] || status;
  }

  getStatusClass(status: string): string {
    if (['active', 'ACTIVE', 'published'].includes(status)) return 'status-active';
    if (['paused', 'PAUSED'].includes(status)) return 'status-paused';
    return 'status-draft';
  }

  getPlatformIcon(platform: string): string {
    if (platform === 'tiktok') return 'play_circle';
    return 'facebook';
  }

  formatNumber(n: number): string {
    if (n >= 1000000) return (n / 1000000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + 'M';
    if (n >= 1000) return (n / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + 'K';
    return n.toString();
  }

  formatCurrency(n: number): string {
    return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  navigateTo(path: string): void {
    this.router.navigate([path]);
  }
}
