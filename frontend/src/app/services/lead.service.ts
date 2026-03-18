import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Lead {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  source: string | null;
  tags: string | null;
  funnel_status: string | null;
  product_interest: string | null;
  value: number | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface LeadInteraction {
  id: number;
  lead_id: number;
  type: string;
  description: string;
  old_value: string | null;
  new_value: string | null;
  created_at: string | null;
}

export interface LeadStats {
  novo: number;
  contatado: number;
  interessado: number;
  convertido: number;
  perdido: number;
  total: number;
}

export interface LeadFilters {
  status?: string;
  tag?: string;
  search?: string;
  page?: number;
  limit?: number;
}

@Injectable({ providedIn: 'root' })
export class LeadService {
  private apiUrl = 'http://localhost:8000/api/leads';

  constructor(private http: HttpClient) {}

  getAll(filters?: LeadFilters): Observable<Lead[]> {
    let params = new HttpParams();
    if (filters) {
      if (filters.status) params = params.set('status', filters.status);
      if (filters.tag) params = params.set('tag', filters.tag);
      if (filters.search) params = params.set('search', filters.search);
      if (filters.page) params = params.set('page', filters.page.toString());
      if (filters.limit) params = params.set('limit', filters.limit.toString());
    }
    return this.http.get<Lead[]>(this.apiUrl, { params });
  }

  getById(id: number): Observable<Lead> {
    return this.http.get<Lead>(`${this.apiUrl}/${id}`);
  }

  create(lead: Partial<Lead>): Observable<Lead> {
    return this.http.post<Lead>(this.apiUrl, lead);
  }

  update(id: number, lead: Partial<Lead>): Observable<Lead> {
    return this.http.put<Lead>(`${this.apiUrl}/${id}`, lead);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  importCsv(file: File): Observable<{ imported: number; errors: string[] }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ imported: number; errors: string[] }>(`${this.apiUrl}/import`, formData);
  }

  getInteractions(leadId: number): Observable<LeadInteraction[]> {
    return this.http.get<LeadInteraction[]>(`${this.apiUrl}/${leadId}/interactions`);
  }

  addInteraction(leadId: number, type: string, description: string): Observable<LeadInteraction> {
    return this.http.post<LeadInteraction>(`${this.apiUrl}/${leadId}/interactions`, { type, description });
  }

  getStats(): Observable<LeadStats> {
    return this.http.get<LeadStats>(`${this.apiUrl}/stats`);
  }
}
