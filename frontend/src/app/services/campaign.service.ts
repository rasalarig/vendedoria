import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Campaign {
  id: number;
  product_id: number;
  creative_id: number | null;
  name: string;
  platform: string;
  status: string;
  objective: string;
  meta_campaign_id: string | null;
  meta_adset_id: string | null;
  meta_ad_id: string | null;
  meta_creative_id: string | null;
  meta_errors: string[] | null;
  targeting: any;
  daily_budget: number;
  total_budget: number;
  spent: number;
  impressions: number;
  clicks: number;
  leads: number;
  conversions: number;
  ctr: number;
  cpc: number;
  cpl: number;
  ai_strategy: string | null;
  product_name: string | null;
  creative_headline: string | null;
  creative_copy: string | null;
  creative_image_url: string | null;
  creative_cta: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface CampaignCreate {
  product_id: number;
  creative_id?: number | null;
  daily_budget: number;
  total_budget?: number;
}

@Injectable({ providedIn: 'root' })
export class CampaignService {
  private apiUrl = 'http://localhost:8000/api/campaigns';

  constructor(private http: HttpClient) {}

  create(data: CampaignCreate): Observable<Campaign> {
    return this.http.post<Campaign>(this.apiUrl, data);
  }

  getAll(): Observable<Campaign[]> {
    return this.http.get<Campaign[]>(this.apiUrl);
  }

  getById(id: number): Observable<Campaign> {
    return this.http.get<Campaign>(`${this.apiUrl}/${id}`);
  }

  pause(id: number): Observable<Campaign> {
    return this.http.put<Campaign>(`${this.apiUrl}/${id}/pause`, {});
  }

  resume(id: number): Observable<Campaign> {
    return this.http.put<Campaign>(`${this.apiUrl}/${id}/resume`, {});
  }

  activate(id: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/activate`, {});
  }

  repair(id: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/repair`, {});
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
