import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { Router } from '@angular/router';

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  avatar_url: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private backendUrl = window.location.hostname === 'localhost' ? 'http://localhost:8001' : '';
  private userSubject = new BehaviorSubject<AuthUser | null>(null);
  user$ = this.userSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {
    this.loadUser();
  }

  get token(): string | null {
    return localStorage.getItem('auth_token');
  }

  get isAuthenticated(): boolean {
    return !!this.token;
  }

  get currentUser(): AuthUser | null {
    return this.userSubject.value;
  }

  private loadUser(): void {
    const saved = localStorage.getItem('auth_user');
    if (saved) {
      this.userSubject.next(JSON.parse(saved));
    }
  }

  getGoogleClientId(): Observable<{client_id: string}> {
    return this.http.get<{client_id: string}>(`${this.backendUrl}/api/auth/google-client-id`);
  }

  loginWithGoogle(credential: string, clientId: string): Observable<{token: string, user: AuthUser}> {
    return this.http.post<{token: string, user: AuthUser}>(`${this.backendUrl}/api/auth/google`, {
      credential, client_id: clientId
    }).pipe(
      tap(res => {
        localStorage.setItem('auth_token', res.token);
        localStorage.setItem('auth_user', JSON.stringify(res.user));
        this.userSubject.next(res.user);
      })
    );
  }

  logout(): void {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    this.userSubject.next(null);
    this.router.navigate(['/login']);
  }

  getMe(): Observable<AuthUser> {
    return this.http.get<AuthUser>(`${this.backendUrl}/api/auth/me`);
  }
}
