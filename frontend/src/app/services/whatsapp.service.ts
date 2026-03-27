import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Contact {
  id: number;
  name: string;
  phone: string;
  tags: string;
  status: string;
  created_at: string | null;
}

export interface WhatsAppCampaign {
  id: number;
  product_id: number | null;
  name: string;
  template_text: string;
  status: string;
  total_contacts: number;
  sent_count: number;
  delivered_count: number;
  read_count: number;
  replied_count: number;
  error_count: number;
  product_name: string | null;
  created_at: string | null;
  messages?: WhatsAppMessage[];
}

export interface WhatsAppMessage {
  id: number;
  contact_name: string;
  contact_phone: string;
  message_text: string;
  status: string;
  sent_at: string | null;
}

export interface CampaignCreateData {
  name: string;
  product_id: number | null;
  template_text: string;
  contact_ids: number[] | null;
  tag_filter: string | null;
}

export interface ImportResult {
  imported: number;
  skipped: number;
  total_in_file: number;
}

@Injectable({ providedIn: 'root' })
export class WhatsAppService {
  private apiUrl = window.location.hostname === 'localhost'
    ? 'http://localhost:8001/api/whatsapp'
    : '/api/whatsapp';

  constructor(private http: HttpClient) {}

  // Contacts
  getContacts(tag?: string): Observable<Contact[]> {
    const params = tag ? `?tag=${encodeURIComponent(tag)}` : '';
    return this.http.get<Contact[]>(`${this.apiUrl}/contacts${params}`);
  }

  createContact(data: { name: string; phone: string; tags: string }): Observable<Contact> {
    return this.http.post<Contact>(`${this.apiUrl}/contacts`, data);
  }

  importContactsCsv(file: File): Observable<ImportResult> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<ImportResult>(`${this.apiUrl}/contacts/import`, formData);
  }

  deleteContact(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/contacts/${id}`);
  }

  // Campaigns
  getCampaigns(): Observable<WhatsAppCampaign[]> {
    return this.http.get<WhatsAppCampaign[]>(`${this.apiUrl}/campaigns`);
  }

  getCampaign(id: number): Observable<WhatsAppCampaign> {
    return this.http.get<WhatsAppCampaign>(`${this.apiUrl}/campaigns/${id}`);
  }

  createCampaign(data: CampaignCreateData): Observable<WhatsAppCampaign> {
    return this.http.post<WhatsAppCampaign>(`${this.apiUrl}/campaigns`, data);
  }

  sendCampaign(id: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/campaigns/${id}/send`, {});
  }

  pauseCampaign(id: number): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/campaigns/${id}/pause`, {});
  }
}
