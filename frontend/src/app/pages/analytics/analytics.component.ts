import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';
import { AnalyticsService, AnalyticsData } from '../../services/analytics.service';

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatTableModule,
    MatSortModule,
    MatProgressBarModule,
    BaseChartDirective,
  ],
  templateUrl: './analytics.component.html',
  styleUrl: './analytics.component.scss',
})
export class AnalyticsComponent implements OnInit {
  @ViewChild(MatSort) sort!: MatSort;

  data: AnalyticsData | null = null;
  loading = true;
  hasData = false;

  // Campaign comparison table
  displayedColumns = ['name', 'platform', 'col1', 'col2', 'col3', 'col4', 'col5', 'col6'];
  tableDataSource = new MatTableDataSource<any>([]);

  // Charts
  lineChartData: ChartConfiguration<'line'>['data'] = { labels: [], datasets: [] };
  lineChartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: '#a1a1aa', font: { family: 'Inter', size: 12 }, usePointStyle: true, pointStyle: 'circle', padding: 20 } },
      tooltip: { backgroundColor: '#27272a', titleColor: '#fafafa', bodyColor: '#a1a1aa', borderColor: '#3f3f46', borderWidth: 1, cornerRadius: 8, padding: 12 },
    },
    scales: {
      x: { ticks: { color: '#52525b', font: { family: 'Inter', size: 11 } }, grid: { color: 'rgba(63,63,70,0.2)', drawTicks: false }, border: { display: false } },
      y: { ticks: { color: '#52525b', font: { family: 'Inter', size: 11 } }, grid: { color: 'rgba(63,63,70,0.2)', drawTicks: false }, border: { display: false } },
    },
  };

  barChartData: ChartConfiguration<'bar'>['data'] = { labels: [], datasets: [] };
  barChartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: '#a1a1aa', font: { family: 'Inter', size: 12 }, usePointStyle: true, padding: 20 } },
      tooltip: { backgroundColor: '#27272a', titleColor: '#fafafa', bodyColor: '#a1a1aa', borderColor: '#3f3f46', borderWidth: 1, cornerRadius: 8, padding: 12 },
    },
    scales: {
      x: { ticks: { color: '#52525b', font: { family: 'Inter', size: 11 } }, grid: { color: 'rgba(63,63,70,0.2)', drawTicks: false }, border: { display: false } },
      y: { ticks: { color: '#52525b', font: { family: 'Inter', size: 11 } }, grid: { color: 'rgba(63,63,70,0.2)', drawTicks: false }, border: { display: false } },
    },
  };

  // Lead funnel
  leadFunnelItems: { label: string; count: number; percent: number; color: string }[] = [];
  totalLeadsInFunnel = 0;

  constructor(private analyticsService: AnalyticsService) {}

  ngOnInit(): void {
    this.analyticsService.get().subscribe({
      next: (data) => {
        this.data = data;
        this.loading = false;
        this.hasData =
          data.kpis.total_leads > 0 ||
          data.kpis.total_spent > 0 ||
          data.campaign_comparison.length > 0;
        this.buildCharts(data);
        this.buildTable(data);
        this.buildLeadFunnel(data);
      },
      error: () => {
        this.loading = false;
        this.hasData = false;
      },
    });
  }

  private buildCharts(data: AnalyticsData): void {
    this.lineChartData = {
      labels: data.chart_data.labels,
      datasets: [
        {
          data: data.chart_data.leads,
          label: 'Leads',
          borderColor: '#8b5cf6',
          backgroundColor: 'rgba(139, 92, 246, 0.08)',
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#8b5cf6',
          borderWidth: 2,
        },
        {
          data: data.chart_data.conversions,
          label: 'Conversoes',
          borderColor: '#ec4899',
          backgroundColor: 'rgba(236, 72, 153, 0.08)',
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#ec4899',
          borderWidth: 2,
        },
      ],
    };

    this.barChartData = {
      labels: data.chart_data.labels,
      datasets: [
        {
          data: data.chart_data.spent,
          label: 'Gasto (R$)',
          backgroundColor: 'rgba(245, 158, 11, 0.5)',
          borderColor: '#f59e0b',
          borderWidth: 1,
          borderRadius: 6,
        },
      ],
    };
  }

  private buildTable(data: AnalyticsData): void {
    this.tableDataSource = new MatTableDataSource(data.campaign_comparison);
    setTimeout(() => {
      if (this.sort) {
        this.tableDataSource.sort = this.sort;
      }
    });
  }

  private buildLeadFunnel(data: AnalyticsData): void {
    const colorMap: Record<string, string> = {
      novo: '#3b82f6',
      contatado: '#06b6d4',
      interessado: '#8b5cf6',
      convertido: '#22c55e',
      perdido: '#ef4444',
    };
    const labelMap: Record<string, string> = {
      novo: 'Novo',
      contatado: 'Contatado',
      interessado: 'Interessado',
      convertido: 'Convertido',
      perdido: 'Perdido',
    };
    this.totalLeadsInFunnel = Object.values(data.lead_stats).reduce((a, b) => a + b, 0);
    this.leadFunnelItems = Object.entries(data.lead_stats).map(([key, count]) => ({
      label: labelMap[key] || key,
      count,
      percent: this.totalLeadsInFunnel > 0 ? Math.round((count / this.totalLeadsInFunnel) * 100) : 0,
      color: colorMap[key] || '#888',
    }));
  }

  getFunnelWidth(value: number): number {
    if (!this.data || !this.data.funnel.length) return 0;
    const maxVal = Math.max(...this.data.funnel.map((f) => f.value), 1);
    return Math.max((value / maxVal) * 100, 8);
  }

  getFunnelDrop(index: number): string {
    if (!this.data || index === 0) return '';
    const prev = this.data.funnel[index - 1].value;
    const curr = this.data.funnel[index].value;
    if (prev === 0) return '-';
    const drop = Math.round((curr / prev) * 100);
    return drop + '%';
  }

  getWaPercent(value: number): number {
    if (!this.data) return 0;
    const max = Math.max(this.data.whatsapp_summary.total_sent, 1);
    return Math.round((value / max) * 100);
  }

  getCampaignCol(row: any, col: number): string | number {
    if (row.platform === 'Meta Ads') {
      switch (col) {
        case 1: return this.formatNumber(row.impressions);
        case 2: return this.formatNumber(row.clicks);
        case 3: return this.formatNumber(row.leads);
        case 4: return this.formatNumber(row.conversions);
        case 5: return 'R$ ' + (row.spent || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        case 6: return (row.ctr || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
        default: return '-';
      }
    } else {
      switch (col) {
        case 1: return this.formatNumber(row.sent);
        case 2: return this.formatNumber(row.delivered);
        case 3: return this.formatNumber(row.read);
        case 4: return this.formatNumber(row.replied);
        case 5: return (row.response_rate || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
        case 6: return '-';
        default: return '-';
      }
    }
  }

  getColHeader(col: number, platform: string): string {
    if (platform === 'meta') {
      return ['', '', 'Impressoes', 'Cliques', 'Leads', 'Conversoes', 'Gasto', 'CTR'][col] || '';
    }
    return ['', '', 'Enviadas', 'Entregues', 'Lidas', 'Respondidas', 'Taxa', '-'][col] || '';
  }

  formatNumber(val: number): string {
    if (val === null || val === undefined) return '-';
    return val.toLocaleString('pt-BR');
  }
}
