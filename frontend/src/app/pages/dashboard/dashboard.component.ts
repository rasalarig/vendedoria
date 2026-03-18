import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';
import { ApiService } from '../../services/api.service';

interface DashboardData {
  metrics: {
    active_campaigns: number;
    leads_today: number;
    conversion_rate: number;
    budget_spent: number;
    budget_total: number;
  };
  chart_data: {
    labels: string[];
    leads: number[];
    conversions: number[];
  };
  recent_activities: {
    type: string;
    message: string;
    time: string;
  }[];
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
    BaseChartDirective,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  metrics = {
    active_campaigns: 3,
    leads_today: 247,
    conversion_rate: 12.5,
    budget_spent: 1250.0,
    budget_total: 5000.0,
  };

  recentActivities: { type: string; message: string; time: string }[] = [
    { type: 'lead', message: 'Novo lead: Joao Silva', time: '5 min atras' },
    { type: 'campaign', message: "Campanha 'Curso Excel' ativada", time: '1h atras' },
    { type: 'whatsapp', message: '150 mensagens enviadas', time: '2h atras' },
    { type: 'conversion', message: 'Venda confirmada: R$297', time: '3h atras' },
  ];

  lineChartData: ChartConfiguration<'line'>['data'] = {
    labels: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom'],
    datasets: [
      {
        data: [12, 19, 8, 25, 32, 47, 35],
        label: 'Leads',
        borderColor: '#8b5cf6',
        backgroundColor: 'rgba(139, 92, 246, 0.08)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#8b5cf6',
        pointBorderColor: '#8b5cf6',
        pointRadius: 4,
        pointHoverRadius: 6,
        borderWidth: 2,
      },
      {
        data: [2, 3, 1, 4, 5, 8, 6],
        label: 'Conversoes',
        borderColor: '#ec4899',
        backgroundColor: 'rgba(236, 72, 153, 0.08)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#ec4899',
        pointBorderColor: '#ec4899',
        pointRadius: 4,
        pointHoverRadius: 6,
        borderWidth: 2,
      },
    ],
  };

  lineChartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: '#a1a1aa',
          font: { family: 'Inter', size: 12 },
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 20,
        },
      },
      tooltip: {
        backgroundColor: '#27272a',
        titleColor: '#fafafa',
        bodyColor: '#a1a1aa',
        borderColor: '#3f3f46',
        borderWidth: 1,
        cornerRadius: 8,
        padding: 12,
        titleFont: { family: 'Inter', size: 13, weight: 'bold' },
        bodyFont: { family: 'Inter', size: 12 },
      },
    },
    scales: {
      x: {
        ticks: { color: '#52525b', font: { family: 'Inter', size: 12 } },
        grid: { color: 'rgba(63, 63, 70, 0.2)', drawTicks: false },
        border: { display: false },
      },
      y: {
        ticks: { color: '#52525b', font: { family: 'Inter', size: 12 } },
        grid: { color: 'rgba(63, 63, 70, 0.2)', drawTicks: false },
        border: { display: false },
      },
    },
  };

  constructor(
    private router: Router,
    private apiService: ApiService,
  ) {}

  ngOnInit(): void {
    this.apiService.get<DashboardData>('/dashboard').subscribe({
      next: (data) => {
        this.metrics = data.metrics;
        this.recentActivities = data.recent_activities;
        this.lineChartData = {
          labels: data.chart_data.labels,
          datasets: [
            {
              ...this.lineChartData.datasets[0],
              data: data.chart_data.leads,
            },
            {
              ...this.lineChartData.datasets[1],
              data: data.chart_data.conversions,
            },
          ],
        };
      },
      error: () => {
        // Use default mock data on error
      },
    });
  }

  getActivityIcon(type: string): string {
    const icons: Record<string, string> = {
      lead: 'person_add',
      campaign: 'campaign',
      whatsapp: 'chat',
      conversion: 'paid',
    };
    return icons[type] || 'info';
  }

  navigateTo(path: string): void {
    this.router.navigate([path]);
  }
}
