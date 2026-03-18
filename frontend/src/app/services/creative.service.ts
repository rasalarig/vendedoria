import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Creative {
  id: number;
  product_id: number;
  variation: number;
  headline: string;
  copy_text: string;
  cta: string;
  image_url: string;
  image_prompt: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

@Injectable({ providedIn: 'root' })
export class CreativeService {
  private apiUrl = 'http://localhost:8000/api/creatives';

  constructor(private http: HttpClient) {}

  generate(productId: number): Observable<Creative[]> {
    return this.http.post<Creative[]>(`${this.apiUrl}/generate/${productId}`, {});
  }

  getAll(productId?: number): Observable<Creative[]> {
    const params = productId ? `?product_id=${productId}` : '';
    return this.http.get<Creative[]>(`${this.apiUrl}${params}`);
  }

  getById(id: number): Observable<Creative> {
    return this.http.get<Creative>(`${this.apiUrl}/${id}`);
  }

  approve(id: number): Observable<Creative> {
    return this.http.put<Creative>(`${this.apiUrl}/${id}/approve`, {});
  }

  reject(id: number): Observable<Creative> {
    return this.http.put<Creative>(`${this.apiUrl}/${id}/reject`, {});
  }

  regenerate(id: number): Observable<Creative> {
    return this.http.post<Creative>(`${this.apiUrl}/${id}/regenerate`, {});
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
