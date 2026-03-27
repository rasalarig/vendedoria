import { Component, OnInit, NgZone, ElementRef, ViewChild, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { I18nService } from '../../services/i18n.service';

declare const google: any;

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent implements OnInit, AfterViewInit {
  @ViewChild('googleBtn', { static: false }) googleBtn!: ElementRef;

  loading = false;
  error = '';
  clientId = '';
  private googleScriptReady = false;
  private viewInitialized = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef,
    private i18n: I18nService,
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
          this.error = this.i18n.t('login.googleNotConfigured');
        }
      },
      error: () => {
        this.error = this.i18n.t('login.serverError');
      },
    });
  }

  ngAfterViewInit(): void {
    this.viewInitialized = true;
    if (this.googleScriptReady) {
      this.initializeGoogle();
    }
  }

  private loadGoogleScript(): void {
    if (typeof google !== 'undefined' && google.accounts) {
      this.googleScriptReady = true;
      if (this.viewInitialized) {
        this.initializeGoogle();
      }
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      this.googleScriptReady = true;
      if (this.viewInitialized) {
        this.initializeGoogle();
      }
    };
    script.onerror = () => {
      this.error = this.i18n.t('login.googleLoadError');
    };
    document.head.appendChild(script);
  }

  private initializeGoogle(): void {
    if (!this.googleBtn?.nativeElement) {
      // ViewChild not yet available, wait for next tick
      setTimeout(() => this.initializeGoogle(), 50);
      return;
    }

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
          this.error = err.error?.detail || this.i18n.t('login.loginError');
        },
      });
    });
  }
}
