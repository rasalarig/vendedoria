import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { SettingsService, AppSettings } from '../../services/settings.service';
import { I18nService } from '../../services/i18n.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatIconModule,
    MatButtonModule,
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
    image_api_key: '',
    image_api_provider: 'together',
    daily_budget_limit: 0,
    monthly_budget_limit: 0,
  };

  saving = false;
  showOptional = false;

  showFields: Record<string, boolean> = {
    meta_app_secret: false,
    meta_access_token: false,
    whatsapp_token: false,
    image_api_key: false,
    tiktok_access_token: false,
  };

  metaConnected = false;
  metaUserName = '';
  metaAccounts: any[] = [];
  metaSelectedAccount = '';
  metaLoading = false;

  // Connections state
  connections: any = null;
  hasPlatformCredentials = false;
  tiktokTooltipVisible = false;

  prerequisites: any = null;
  prerequisitesLoading = false;

  helpModalOpen = false;
  helpModalTitle = '';
  helpModalSteps: string[] = [];
  helpModalLink = '';
  helpModalLinkText = '';

  private getHelpContent(): Record<string, { title: string; steps: string[]; link?: string; linkText?: string }> {
    return {
      overview: {
        title: this.i18n.t('settings.helpOverviewTitle'),
        steps: [
          this.i18n.t('settings.helpOverviewStep1'),
          this.i18n.t('settings.helpOverviewStep2'),
          this.i18n.t('settings.helpOverviewStep3'),
          this.i18n.t('settings.helpOverviewStep4'),
        ]
      },
      meta_connected: {
        title: this.i18n.t('settings.helpMetaTitle'),
        steps: [
          this.i18n.t('settings.helpMetaStep1'),
          this.i18n.t('settings.helpMetaStep2'),
          this.i18n.t('settings.helpMetaStep3'),
          this.i18n.t('settings.helpMetaStep4'),
          this.i18n.t('settings.helpMetaStep5'),
          this.i18n.t('settings.helpMetaStep6'),
          this.i18n.t('settings.helpMetaStep7'),
        ],
        link: 'https://developers.facebook.com/apps/',
        linkText: this.i18n.t('settings.helpMetaLink'),
      },
      ad_account: {
        title: this.i18n.t('settings.helpAdAccountTitle'),
        steps: [
          this.i18n.t('settings.helpAdAccountStep1'),
          this.i18n.t('settings.helpAdAccountStep2'),
          this.i18n.t('settings.helpAdAccountStep3'),
          this.i18n.t('settings.helpAdAccountStep4'),
          this.i18n.t('settings.helpAdAccountStep5'),
        ],
        link: 'https://business.facebook.com/settings/ad-accounts',
        linkText: this.i18n.t('settings.helpAdAccountLink'),
      },
      facebook_page: {
        title: this.i18n.t('settings.helpFacebookPageTitle'),
        steps: [
          this.i18n.t('settings.helpFacebookPageStep1'),
          this.i18n.t('settings.helpFacebookPageStep2'),
          this.i18n.t('settings.helpFacebookPageStep3'),
          this.i18n.t('settings.helpFacebookPageStep4'),
          this.i18n.t('settings.helpFacebookPageStep5'),
          this.i18n.t('settings.helpFacebookPageStep6'),
        ],
        link: 'https://www.facebook.com/pages/creation/',
        linkText: this.i18n.t('settings.helpFacebookPageLink'),
      },
      pixel_configured: {
        title: this.i18n.t('settings.helpPixelTitle'),
        steps: [
          this.i18n.t('settings.helpPixelStep1'),
          this.i18n.t('settings.helpPixelStep2'),
          this.i18n.t('settings.helpPixelStep3'),
          this.i18n.t('settings.helpPixelStep4'),
          this.i18n.t('settings.helpPixelStep5'),
        ],
        link: 'https://business.facebook.com/events_manager',
        linkText: this.i18n.t('settings.helpPixelLink'),
      },
      has_product: {
        title: this.i18n.t('settings.helpProductTitle'),
        steps: [
          this.i18n.t('settings.helpProductStep1'),
          this.i18n.t('settings.helpProductStep2'),
          this.i18n.t('settings.helpProductStep3'),
          this.i18n.t('settings.helpProductStep4'),
          this.i18n.t('settings.helpProductStep5'),
        ]
      },
      has_creative: {
        title: this.i18n.t('settings.helpCreativeTitle'),
        steps: [
          this.i18n.t('settings.helpCreativeStep1'),
          this.i18n.t('settings.helpCreativeStep2'),
          this.i18n.t('settings.helpCreativeStep3'),
          this.i18n.t('settings.helpCreativeStep4'),
          this.i18n.t('settings.helpCreativeStep5'),
        ]
      },
      payment_method: {
        title: this.i18n.t('settings.helpPaymentTitle'),
        steps: [
          this.i18n.t('settings.helpPaymentStep1'),
          this.i18n.t('settings.helpPaymentStep2'),
          this.i18n.t('settings.helpPaymentStep3'),
          this.i18n.t('settings.helpPaymentStep4'),
          this.i18n.t('settings.helpPaymentStep5'),
        ],
        link: 'https://www.facebook.com/ads/manager/account_settings/account_billing/',
        linkText: this.i18n.t('settings.helpPaymentLink'),
      },
      app_mode_live: {
        title: this.i18n.t('settings.helpAppLiveTitle'),
        steps: [
          this.i18n.t('settings.helpAppLiveStep1'),
          this.i18n.t('settings.helpAppLiveStep2'),
          this.i18n.t('settings.helpAppLiveStep3'),
          this.i18n.t('settings.helpAppLiveStep4'),
          this.i18n.t('settings.helpAppLiveStep5'),
          this.i18n.t('settings.helpAppLiveStep6'),
        ],
        link: 'https://developers.facebook.com/apps/',
        linkText: this.i18n.t('settings.helpAppLiveLink'),
      }
    };
  }

  getCompletedCount(): number {
    if (!this.prerequisites) return 0;
    let count = 0;
    if (this.prerequisites.meta_connected) count++;
    if (this.prerequisites.ad_account) count++;
    if (this.prerequisites.facebook_page) count++;
    if (this.prerequisites.payment_method) count++;
    if (this.prerequisites.app_mode_live) count++;
    if (this.prerequisites.has_product) count++;
    if (this.prerequisites.has_creative) count++;
    return count;
  }

  getTotalRequired(): number {
    return 7;
  }

  getProgressPercent(): number {
    return (this.getCompletedCount() / this.getTotalRequired()) * 100;
  }

  constructor(
    private settingsService: SettingsService,
    private snackBar: MatSnackBar,
    private route: ActivatedRoute,
    public i18n: I18nService,
  ) {}

  ngOnInit(): void {
    this.loadSettings();
    this.loadPrerequisites();
    this.loadConnections();
    this.loadPlatformCredentials();
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

  loadConnections(): void {
    this.settingsService.getConnections().subscribe({
      next: (data: any) => {
        this.connections = data;
      },
      error: () => {},
    });
  }

  loadPlatformCredentials(): void {
    this.settingsService.getPlatformCredentials().subscribe({
      next: (data) => {
        this.hasPlatformCredentials = data.has_platform_credentials;
      },
      error: () => {},
    });
  }

  connectMetaSimplified(): void {
    // When platform has credentials pre-configured, skip App ID/Secret fields
    this.openMetaAuth();
  }

  showTiktokTooltip(): void {
    this.tiktokTooltipVisible = true;
    setTimeout(() => { this.tiktokTooltipVisible = false; }, 2500);
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
        this.snackBar.open(this.i18n.t('settings.saved'), 'OK', {
          duration: 3000,
          horizontalPosition: 'end',
          verticalPosition: 'top',
        });
      },
      error: () => {
        this.saving = false;
        this.snackBar.open(this.i18n.t('settings.saveError'), this.i18n.t('common.close'), {
          duration: 5000,
          horizontalPosition: 'end',
          verticalPosition: 'top',
        });
      },
    });
  }

  connectMeta(): void {
    // If platform has credentials, skip user-provided App ID/Secret
    if (this.hasPlatformCredentials) {
      this.openMetaAuth();
      return;
    }
    // First save App ID and Secret if they've been filled
    if (this.settings.meta_app_id && this.settings.meta_app_secret) {
      const { id, ...payload } = this.settings as AppSettings & { id?: number };
      this.settingsService.update(payload).subscribe({
        next: () => {
          this.openMetaAuth();
        },
        error: () => {
          this.snackBar.open(this.i18n.t('settings.errorSaveAppSecret'), this.i18n.t('common.close'), { duration: 3000 });
        },
      });
    } else {
      this.snackBar.open(this.i18n.t('settings.fillAppId'), this.i18n.t('common.close'), { duration: 3000 });
    }
  }

  private openMetaAuth(): void {
    this.metaLoading = true;
    this.settingsService.getMetaAuthUrl().subscribe({
      next: (data) => {
        if (data.error) {
          this.snackBar.open(data.error, this.i18n.t('common.close'), { duration: 5000 });
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
        this.snackBar.open(this.i18n.t('settings.errorMetaAuth'), this.i18n.t('common.close'), { duration: 5000 });
      },
    });
  }

  private handleMetaCallback(code: string): void {
    this.settingsService.metaCallback(code).subscribe({
      next: (data) => {
        if (data.error) {
          this.snackBar.open(this.i18n.t('settings.errorPrefix').replace('{error}', data.error), this.i18n.t('common.close'), { duration: 5000 });
          this.metaLoading = false;
          return;
        }
        this.metaConnected = true;
        this.metaUserName = data.user_name || '';
        this.snackBar.open(this.i18n.t('settings.connectedAs').replace('{name}', this.metaUserName), 'OK', { duration: 3000 });
        this.loadMetaAccounts();
        this.loadSettings(); // Refresh settings
      },
      error: () => {
        this.metaLoading = false;
        this.snackBar.open(this.i18n.t('settings.errorMetaCallback'), this.i18n.t('common.close'), { duration: 5000 });
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
        this.snackBar.open(this.i18n.t('settings.adAccountSelected'), 'OK', { duration: 3000 });
      },
    });
  }

  openHelpModal(key: string): void {
    const content = this.getHelpContent()[key];
    if (content) {
      this.helpModalTitle = content.title;
      this.helpModalSteps = content.steps;
      this.helpModalLink = content.link || '';
      this.helpModalLinkText = content.linkText || '';
      this.helpModalOpen = true;
    }
  }

  closeHelpModal(): void {
    this.helpModalOpen = false;
  }

  disconnectMeta(): void {
    if (confirm(this.i18n.t('settings.disconnectConfirm'))) {
      this.settingsService.disconnectMeta().subscribe({
        next: () => {
          this.metaConnected = false;
          this.metaUserName = '';
          this.metaAccounts = [];
          this.metaSelectedAccount = '';
          this.settings.meta_access_token = '';
          this.settings.meta_ad_account_id = '';
          this.snackBar.open(this.i18n.t('settings.metaDisconnected'), 'OK', { duration: 3000 });
        },
      });
    }
  }
}
