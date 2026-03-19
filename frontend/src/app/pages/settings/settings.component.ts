import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { SettingsService, AppSettings } from '../../services/settings.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatTabsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSnackBarModule,
  ],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
})
export class SettingsComponent implements OnInit {
  settings: AppSettings = {
    meta_app_id: '',
    meta_app_secret: '',
    meta_access_token: '',
    meta_ad_account_id: '',
    whatsapp_phone_id: '',
    whatsapp_token: '',
    whatsapp_business_id: '',
    ai_api_key: '',
    ai_provider: 'claude',
    operation_mode: 'manual',
    tiktok_access_token: '',
    tiktok_advertiser_id: '',
    daily_budget_limit: 0,
    monthly_budget_limit: 0,
  };

  saving = false;

  showFields: Record<string, boolean> = {
    meta_app_secret: false,
    meta_access_token: false,
    whatsapp_token: false,
    ai_api_key: false,
    tiktok_access_token: false,
  };

  metaConnected = false;
  metaUserName = '';
  metaAccounts: any[] = [];
  metaSelectedAccount = '';
  metaLoading = false;

  prerequisites: any = null;
  prerequisitesLoading = false;

  constructor(
    private settingsService: SettingsService,
    private snackBar: MatSnackBar,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.loadSettings();
    this.loadPrerequisites();
    // Check for OAuth callback code in URL
    this.route.queryParams.subscribe(params => {
      if (params['code']) {
        this.handleMetaCallback(params['code']);
      }
    });
  }

  loadPrerequisites(): void {
    this.prerequisitesLoading = true;
    this.settingsService.getPrerequisites().subscribe({
      next: (data) => {
        this.prerequisites = data;
        this.prerequisitesLoading = false;
      },
      error: () => {
        this.prerequisitesLoading = false;
      },
    });
  }

  loadSettings(): void {
    this.settingsService.get().subscribe({
      next: (data) => {
        this.settings = data;
        // Check if Meta is connected
        if (data.meta_access_token && data.meta_user_name) {
          this.metaConnected = true;
          this.metaUserName = data.meta_user_name || '';
          this.metaSelectedAccount = data.meta_ad_account_id || '';
          this.loadMetaAccounts();
        }
      },
      error: () => {
        // Keep defaults on error
      },
    });
  }

  toggleVisibility(field: string): void {
    this.showFields[field] = !this.showFields[field];
  }

  saveSettings(): void {
    this.saving = true;
    const { id, ...payload } = this.settings as AppSettings & { id?: number };
    this.settingsService.update(payload).subscribe({
      next: (data) => {
        this.settings = data;
        this.saving = false;
        this.snackBar.open('Configuracoes salvas com sucesso!', 'OK', {
          duration: 3000,
          horizontalPosition: 'end',
          verticalPosition: 'top',
        });
      },
      error: () => {
        this.saving = false;
        this.snackBar.open('Erro ao salvar configuracoes.', 'Fechar', {
          duration: 5000,
          horizontalPosition: 'end',
          verticalPosition: 'top',
        });
      },
    });
  }

  connectMeta(): void {
    // First save App ID and Secret if they've been filled
    if (this.settings.meta_app_id && this.settings.meta_app_secret) {
      const { id, ...payload } = this.settings as AppSettings & { id?: number };
      this.settingsService.update(payload).subscribe({
        next: () => {
          this.openMetaAuth();
        },
        error: () => {
          this.snackBar.open('Erro ao salvar App ID/Secret.', 'Fechar', { duration: 3000 });
        },
      });
    } else {
      this.snackBar.open('Preencha o App ID e App Secret primeiro.', 'Fechar', { duration: 3000 });
    }
  }

  private openMetaAuth(): void {
    this.metaLoading = true;
    this.settingsService.getMetaAuthUrl().subscribe({
      next: (data) => {
        if (data.error) {
          this.snackBar.open(data.error, 'Fechar', { duration: 5000 });
          this.metaLoading = false;
          return;
        }
        if (data.auth_url) {
          // Open popup
          const popup = window.open(data.auth_url, 'meta_oauth', 'width=600,height=700,scrollbars=yes');
          // Listen for the redirect back
          const interval = setInterval(() => {
            try {
              if (popup && popup.closed) {
                clearInterval(interval);
                this.metaLoading = false;
                return;
              }
              if (popup && popup.location.href.includes('code=')) {
                const url = new URL(popup.location.href);
                const code = url.searchParams.get('code');
                popup.close();
                clearInterval(interval);
                if (code) {
                  this.handleMetaCallback(code);
                } else {
                  this.metaLoading = false;
                }
              }
            } catch (e) {
              // Cross-origin - popup still on Facebook, wait
            }
          }, 500);
        }
      },
      error: () => {
        this.metaLoading = false;
        this.snackBar.open('Erro ao iniciar conexao com Facebook.', 'Fechar', { duration: 5000 });
      },
    });
  }

  private handleMetaCallback(code: string): void {
    this.settingsService.metaCallback(code).subscribe({
      next: (data) => {
        if (data.error) {
          this.snackBar.open(`Erro: ${data.error}`, 'Fechar', { duration: 5000 });
          this.metaLoading = false;
          return;
        }
        this.metaConnected = true;
        this.metaUserName = data.user_name || '';
        this.snackBar.open(`Conectado como ${this.metaUserName}!`, 'OK', { duration: 3000 });
        this.loadMetaAccounts();
        this.loadSettings(); // Refresh settings
      },
      error: () => {
        this.metaLoading = false;
        this.snackBar.open('Erro ao processar autorizacao.', 'Fechar', { duration: 5000 });
      },
    });
  }

  loadMetaAccounts(): void {
    this.settingsService.getMetaAccounts().subscribe({
      next: (data) => {
        this.metaLoading = false;
        if (data.accounts) {
          this.metaAccounts = data.accounts;
          this.metaSelectedAccount = data.selected || '';
        }
      },
      error: () => {
        this.metaLoading = false;
      },
    });
  }

  selectMetaAccount(accountId: string): void {
    const account = this.metaAccounts.find(a => a.id === accountId);
    this.settingsService.selectMetaAccount(accountId, account?.name || '').subscribe({
      next: () => {
        this.metaSelectedAccount = accountId;
        this.settings.meta_ad_account_id = accountId;
        this.snackBar.open('Conta de anuncios selecionada!', 'OK', { duration: 3000 });
      },
    });
  }

  disconnectMeta(): void {
    if (confirm('Tem certeza que deseja desconectar sua conta Meta Ads?')) {
      this.settingsService.disconnectMeta().subscribe({
        next: () => {
          this.metaConnected = false;
          this.metaUserName = '';
          this.metaAccounts = [];
          this.metaSelectedAccount = '';
          this.settings.meta_access_token = '';
          this.settings.meta_ad_account_id = '';
          this.snackBar.open('Meta Ads desconectado.', 'OK', { duration: 3000 });
        },
      });
    }
  }
}
