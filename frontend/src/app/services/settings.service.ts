import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface AppSettings {
  id?: number;
  meta_app_id: string;
  meta_app_secret: string;
  meta_access_token: string;
  meta_ad_account_id: string;
  meta_user_name?: string;
  whatsapp_phone_id: string;
  whatsapp_token: string;
  whatsapp_business_id: string;
  ai_api_key: string;
  ai_provider: string;
  operation_mode: 'manual' | 'semi_auto' | 'auto';
  tiktok_access_token?: string;
  tiktok_advertiser_id?: string;
  image_api_key?: string;
  image_api_provider?: string;
  daily_budget_limit: number;
  monthly_budget_limit: number;
}

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private backendUrl = window.location.hostname === 'localhost' ? 'http://localhost:8001' : '';
  private apiUrl = this.backendUrl + '/api/settings';

  constructor(private http: HttpClient) {}

  get(): Observable<AppSettings> {
    return this.http.get<AppSettings>(this.apiUrl);
  }

  update(settings: Partial<AppSettings>): Observable<AppSettings> {
    return this.http.put<AppSettings>(this.apiUrl, settings);
  }

  getStatus(): Observable<{ai_configured: boolean, meta_configured: boolean, whatsapp_configured: boolean}> {
    return this.http.get<{ai_configured: boolean, meta_configured: boolean, whatsapp_configured: boolean}>(`${this.apiUrl}/status`);
  }

  getMetaAuthUrl(): Observable<{auth_url?: string, error?: string}> {
    return this.http.get<{auth_url?: string, error?: string}>(`${this.backendUrl}/api/meta/auth-url`);
  }

  metaCallback(code: string): Observable<{success?: boolean, user_name?: string, error?: string}> {
    return this.http.get<{success?: boolean, user_name?: string, error?: string}>(`${this.backendUrl}/api/meta/callback?code=${code}`);
  }

  getMetaAccounts(): Observable<{accounts?: any[], selected?: string, error?: string}> {
    return this.http.get<{accounts?: any[], selected?: string, error?: string}>(`${this.backendUrl}/api/meta/accounts`);
  }

  selectMetaAccount(accountId: string, accountName: string): Observable<any> {
    return this.http.post(`${this.backendUrl}/api/meta/select-account`, {account_id: accountId, account_name: accountName});
  }

  disconnectMeta(): Observable<any> {
    return this.http.post(`${this.backendUrl}/api/meta/disconnect`, {});
  }

  reconnectMeta(): Observable<{success?: boolean, auth_url?: string, error?: string}> {
    return this.http.post<{success?: boolean, auth_url?: string, error?: string}>(`${this.backendUrl}/api/meta/reconnect`, {});
  }

  getPrerequisites(): Observable<any> {
    return this.http.get(`${this.apiUrl}/prerequisites`);
  }

  getAppMode(): Observable<{mode: string, app_id: string, app_name: string, error?: string}> {
    return this.http.get<{mode: string, app_id: string, app_name: string, error?: string}>(`${this.backendUrl}/api/meta/app-mode`);
  }

  getConnections(): Observable<any> {
    return this.http.get(`${this.apiUrl}/connections`);
  }

  getPlatformCredentials(): Observable<{has_platform_credentials: boolean}> {
    return this.http.get<{has_platform_credentials: boolean}>(`${this.backendUrl}/api/meta/platform-credentials`);
  }
}
