import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ChatMessage {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  attachment_path?: string;
  attachment_type?: string;
  action_taken?: string;
  action_data?: any;
  created_at: string;
  is_error?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ChatService {
  private apiUrl = window.location.hostname === 'localhost'
    ? 'http://localhost:8000/api/chat'
    : '/api/chat';

  constructor(private http: HttpClient) {}

  sendMessage(message: string, file?: File): Observable<ChatMessage> {
    const formData = new FormData();
    formData.append('message', message);
    if (file) {
      formData.append('file', file);
    }
    return this.http.post<ChatMessage>(this.apiUrl, formData);
  }

  getHistory(): Observable<ChatMessage[]> {
    return this.http.get<ChatMessage[]>(`${this.apiUrl}/history`);
  }

  clearHistory(): Observable<any> {
    return this.http.delete(`${this.apiUrl}/clear`);
  }
}
