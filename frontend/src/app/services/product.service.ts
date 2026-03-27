import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  target_audience: string;
  differentials: string;
  image_path: string | null;
  product_type?: string;  // produto, servico
  pricing_type: string;  // one_time, monthly, yearly, weekly, custom
  recurrence_period?: string;
  website_url?: string;
  created_at: string;
  updated_at: string | null;
}

@Injectable({ providedIn: 'root' })
export class ProductService {
  private apiUrl = window.location.hostname === 'localhost'
    ? 'http://localhost:8001/api/products'
    : '/api/products';

  constructor(private http: HttpClient) {}

  getAll(): Observable<Product[]> {
    return this.http.get<Product[]>(this.apiUrl);
  }

  getById(id: number): Observable<Product> {
    return this.http.get<Product>(`${this.apiUrl}/${id}`);
  }

  create(formData: FormData): Observable<Product> {
    return this.http.post<Product>(this.apiUrl, formData);
  }

  update(id: number, formData: FormData): Observable<Product> {
    return this.http.put<Product>(`${this.apiUrl}/${id}`, formData);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
