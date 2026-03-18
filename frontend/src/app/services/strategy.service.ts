import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface BestTimes {
  weekdays: string[];
  hours: string[];
}

export interface Objection {
  objection: string;
  response: string;
}

export interface MarketStrategy {
  id: number;
  product_id: number;
  product_name: string;
  market_analysis: string;
  target_audience_analysis: string;
  best_times: BestTimes;
  recommended_channels: string[];
  tone_of_voice: string;
  selling_arguments: string[];
  common_objections: Objection[];
  budget_suggestion: string;
  competitor_insights: string;
  web_research_data: string;
  created_at: string;
}

@Injectable({ providedIn: 'root' })
export class StrategyService {
  private apiUrl = 'http://localhost:8000/api/strategy';

  constructor(private http: HttpClient) {}

  generate(productId: number): Observable<MarketStrategy> {
    return this.http.post<MarketStrategy>(`${this.apiUrl}/generate/${productId}`, {});
  }

  getAll(): Observable<MarketStrategy[]> {
    return this.http.get<MarketStrategy[]>(this.apiUrl);
  }

  getById(id: number): Observable<MarketStrategy> {
    return this.http.get<MarketStrategy>(`${this.apiUrl}/${id}`);
  }

  getByProduct(productId: number): Observable<MarketStrategy> {
    return this.http.get<MarketStrategy>(`${this.apiUrl}/product/${productId}`);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
