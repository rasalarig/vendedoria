import { Injectable } from '@angular/core';
import { HttpClient, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { getBackendUrl } from './env.helper';

export interface ReferenceVideo {
  id: number;
  filename: string;
  original_filename: string;
  file_size: number;
  duration: number | null;
  tags: string[];
  created_at: string;
}

@Injectable({ providedIn: 'root' })
export class VideoService {
  private apiUrl = `${getBackendUrl()}/api/reference-videos`;

  constructor(private http: HttpClient) {}

  getVideos(): Observable<ReferenceVideo[]> {
    return this.http.get<ReferenceVideo[]>(this.apiUrl);
  }

  uploadVideo(file: File, tags?: string[]): Observable<HttpEvent<ReferenceVideo>> {
    const formData = new FormData();
    formData.append('file', file);
    if (tags && tags.length > 0) {
      formData.append('tags', JSON.stringify(tags));
    }
    return this.http.post<ReferenceVideo>(this.apiUrl + '/upload', formData, {
      reportProgress: true,
      observe: 'events',
    });
  }

  deleteVideo(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  getStreamUrl(id: number): string {
    return `${this.apiUrl}/${id}/stream`;
  }
}
