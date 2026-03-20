import { Component, OnInit, NgZone, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

declare const google: any;

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent implements OnInit {
  @ViewChild('googleBtn', { static: true }) googleBtn!: ElementRef;

  loading = false;
  error = '';
  clientId = '';

  constructor(
    private authService: AuthService,
    private router: Router,
    private ngZone: NgZone,
  ) {}

  ngOnInit(): void {
    if (this.authService.isAuthenticated) {
      this.router.navigate(['/chat']);
      return;
    }

    this.authService.getGoogleClientId().subscribe({
      next: (res) => {
        this.clientId = res.client_id;
        if (this.clientId) {
          this.loadGoogleScript();
        } else {
          this.error = 'Google Client ID nao configurado no servidor.';
        }
      },
      error: () => {
        this.error = 'Erro ao conectar com o servidor.';
      },
    });
  }

  private loadGoogleScript(): void {
    if (typeof google !== 'undefined' && google.accounts) {
      this.initializeGoogle();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => this.initializeGoogle();
    script.onerror = () => {
      this.error = 'Erro ao carregar Google Sign-In.';
    };
    document.head.appendChild(script);
  }

  private initializeGoogle(): void {
    google.accounts.id.initialize({
      client_id: this.clientId,
      callback: (response: any) => this.handleCredentialResponse(response),
    });

    google.accounts.id.renderButton(this.googleBtn.nativeElement, {
      theme: 'filled_black',
      size: 'large',
      width: 320,
      text: 'continue_with',
      shape: 'rectangular',
      logo_alignment: 'left',
    });
  }

  private handleCredentialResponse(response: any): void {
    this.ngZone.run(() => {
      this.loading = true;
      this.error = '';

      this.authService.loginWithGoogle(response.credential, this.clientId).subscribe({
        next: () => {
          this.router.navigate(['/chat']);
        },
        error: (err) => {
          this.loading = false;
          this.error = err.error?.detail || 'Erro ao fazer login. Tente novamente.';
        },
      });
    });
  }
}
