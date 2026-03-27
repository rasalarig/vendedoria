import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface AnalyticsData {
  kpis: {
    total_spent: number;
    total_leads: number;
    total_conversions: number;
    cpl: number;
    cpa: number;
    avg_ctr: number;
    roas: number;
    wa_response_rate: number;
  };
  funnel: { stage: string; value: number; color: string }[];
  lead_stats: Record<string, number>;
  campaign_comparison: any[];
  meta_summary: {
    total_campaigns: number;
    active: number;
    total_impressions: number;
    total_clicks: number;
    total_spent: number;
  };
  whatsapp_summary: {
    total_campaigns: number;
    total_sent: number;
    total_delivered: number;
    total_read: number;
    total_replied: number;
  };
  chart_data: {
    labels: string[];
    leads: number[];
    conversions: number[];
    spent: number[];
  };
}

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private apiUrl = window.location.hostname === 'localhost'
    ? 'http://localhost:8001/api/analytics'
    : '/api/analytics';

  constructor(private http: HttpClient) {}

  get(): Observable<AnalyticsData> {
    return this.http.get<AnalyticsData>(this.apiUrl);
  }
}
