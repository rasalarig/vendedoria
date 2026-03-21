import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { getBackendUrl } from './env.helper';

export interface CostEstimate {
  provider: string;
  duration: number;
  estimated_cost: number;
  currency: string;
}

export interface GeneratedVideo {
  id: number;
  seller_id: number;
  seller_name?: string;
  product_id: number;
  product_name?: string;
  reference_video_id?: number;
  provider: string;
  duration: number;
  script: string;
  video_url?: string;
  thumbnail_url?: string;
  status: 'generating' | 'ready' | 'approved' | 'failed';
  cost: number;
  version: number;
  created_at: string;
  updated_at?: string;
}

export interface GenerateVideoRequest {
  seller_id: number;
  product_id: number;
  reference_video_id?: number;
  provider?: string;
  duration?: number;
}

export interface GenerateVideoResponse {
  video_id: number;
  script: string;
  status: string;
  estimated_cost: number;
}

@Injectable({ providedIn: 'root' })
export class VideoCreativeService {
  private apiUrl = `${getBackendUrl()}/api/creatives`;

  constructor(private http: HttpClient) {}

  estimateCost(provider: string, duration: number): Observable<CostEstimate> {
    return this.http.get<CostEstimate>(
      `${this.apiUrl}/estimate-cost?provider=${encodeURIComponent(provider)}&duration=${duration}`
    );
  }

  generateVideo(
    sellerId: number,
    productId: number,
    refVideoId?: number,
    provider?: string,
    duration?: number
  ): Observable<GenerateVideoResponse> {
    const body: GenerateVideoRequest = {
      seller_id: sellerId,
      product_id: productId,
    };
    if (refVideoId) body.reference_video_id = refVideoId;
    if (provider) body.provider = provider;
    if (duration) body.duration = duration;
    return this.http.post<GenerateVideoResponse>(`${this.apiUrl}/generate-video`, body);
  }

  getGeneratedVideos(): Observable<GeneratedVideo[]> {
    return this.http.get<GeneratedVideo[]>(`${this.apiUrl}/generated-videos`);
  }

  getGeneratedVideo(id: number): Observable<GeneratedVideo> {
    return this.http.get<GeneratedVideo>(`${this.apiUrl}/generated-videos/${id}`);
  }

  approveVideo(id: number): Observable<GeneratedVideo> {
    return this.http.post<GeneratedVideo>(`${this.apiUrl}/generated-videos/${id}/approve`, {});
  }

  regenerateVideo(id: number, script?: string): Observable<GenerateVideoResponse> {
    const body = script ? { script } : {};
    return this.http.post<GenerateVideoResponse>(`${this.apiUrl}/generated-videos/${id}/regenerate`, body);
  }
}
