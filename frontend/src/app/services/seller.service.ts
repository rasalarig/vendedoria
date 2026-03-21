import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface SellerFace {
  id: string;
  name: string;
  gender: string;
  age_range: string;
  style: string;
  thumbnail_url: string;
  is_custom: boolean;
}

export interface SellerVoice {
  id: string;
  name: string;
  gender: string;
  tone: string;
  language: string;
  preview_url: string;
}

export interface Seller {
  id: number;
  name: string;
  avatar_face: string;
  avatar_face_url: string | null;
  voice_id: string;
  personality: string;
  language_style: string;
  catchphrases: string;
  created_at: string;
}

export interface FaceUploadResult {
  face_id: string;
  thumbnail_url: string;
}

@Injectable({ providedIn: 'root' })
export class SellerService {
  private apiUrl = window.location.hostname === 'localhost'
    ? 'http://localhost:8000/api/sellers'
    : '/api/sellers';

  constructor(private http: HttpClient) {}

  getFaces(): Observable<SellerFace[]> {
    return this.http.get<SellerFace[]>(`${this.apiUrl}/faces`);
  }

  getVoices(): Observable<SellerVoice[]> {
    return this.http.get<SellerVoice[]>(`${this.apiUrl}/voices`);
  }

  uploadFace(file: File): Observable<FaceUploadResult> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<FaceUploadResult>(`${this.apiUrl}/faces/upload`, formData);
  }

  getSellers(): Observable<Seller[]> {
    return this.http.get<Seller[]>(this.apiUrl);
  }

  createSeller(data: {
    name: string;
    avatar_face: string;
    avatar_face_url?: string;
    voice_id: string;
    personality: string;
    language_style: string;
    catchphrases: string;
  }): Observable<Seller> {
    return this.http.post<Seller>(this.apiUrl, data);
  }

  deleteSeller(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
