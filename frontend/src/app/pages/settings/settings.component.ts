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
    image_api_key: '',
    image_api_provider: 'together',
    daily_budget_limit: 0,
    monthly_budget_limit: 0,
  };

  saving = false;

  showFields: Record<string, boolean> = {
    meta_app_secret: false,
    meta_access_token: false,
    whatsapp_token: false,
    ai_api_key: false,
    image_api_key: false,
    tiktok_access_token: false,
  };

  metaConnected = false;
  metaUserName = '';
  metaAccounts: any[] = [];
  metaSelectedAccount = '';
  metaLoading = false;

  prerequisites: any = null;
  prerequisitesLoading = false;

  helpModalOpen = false;
  helpModalTitle = '';
  helpModalSteps: string[] = [];
  helpModalLink = '';
  helpModalLinkText = '';

  private helpContent: Record<string, { title: string; steps: string[]; link?: string; linkText?: string }> = {
    meta_connected: {
      title: 'Como conectar sua conta Meta',
      steps: [
        'Acesse developers.facebook.com e crie um app do tipo "Empresa" (se ainda nao tiver)',
        'Copie o App ID e o App Secret do seu app',
        'Na secao "Credenciais" abaixo, cole o App ID e App Secret nos campos correspondentes',
        'Clique em "Conectar com Meta" — voce sera redirecionado ao Facebook',
        'Faca login com sua conta do Facebook e autorize o acesso',
        'Selecione o portfolio empresarial (Business Manager) que contem sua conta de anuncios',
        'Pronto! O Vendedoria tera acesso para gerenciar suas campanhas'
      ],
      link: 'https://developers.facebook.com/apps/',
      linkText: 'Abrir Meta for Developers'
    },
    ad_account: {
      title: 'Como selecionar a conta de anuncios',
      steps: [
        'Primeiro, conecte sua conta Meta (passo anterior)',
        'Apos conectar, as contas de anuncios do seu Business Manager aparecerao automaticamente',
        'Selecione a conta que deseja usar para veicular campanhas',
        'A conta deve estar ATIVA (sem restricoes ou bloqueios)',
        'Se nao aparecer nenhuma conta, crie uma em business.facebook.com > Configuracoes > Contas de anuncios'
      ],
      link: 'https://business.facebook.com/settings/ad-accounts',
      linkText: 'Gerenciar contas no Business Manager'
    },
    facebook_page: {
      title: 'Como vincular uma pagina do Facebook',
      steps: [
        'Voce precisa ter uma Pagina do Facebook para seus anuncios aparecerem',
        'Os anuncios no Facebook e Instagram sao publicados em nome dessa pagina',
        'Se ainda nao tem uma pagina, crie uma em facebook.com/pages/creation/',
        'Vincule a pagina ao seu Business Manager em business.facebook.com > Configuracoes > Paginas',
        'Apos conectar o Meta no Vendedoria, as paginas disponiveis serao listadas automaticamente',
        'Selecione a pagina desejada na secao de configuracoes'
      ],
      link: 'https://www.facebook.com/pages/creation/',
      linkText: 'Criar pagina no Facebook'
    },
    pixel_configured: {
      title: 'Como configurar o Meta Pixel',
      steps: [
        'O Pixel e um codigo que rastreia visitantes e conversoes no seu site (opcional, mas recomendado)',
        'Va na aba "Pixel" nas configuracoes do Vendedoria para criar ou vincular um pixel',
        'Apos criar, copie o codigo do pixel e instale no seu site (no <head> de todas as paginas)',
        'Com o pixel instalado, o Meta consegue otimizar suas campanhas para conversoes reais',
        'Voce tambem pode gerenciar pixels diretamente no Events Manager do Meta'
      ],
      link: 'https://business.facebook.com/events_manager',
      linkText: 'Abrir Events Manager'
    },
    has_product: {
      title: 'Como cadastrar um produto',
      steps: [
        'Use o chat: diga "quero cadastrar um produto" e a IA vai guiar voce',
        'Ou acesse a aba "Produtos" e clique em "Novo Produto"',
        'Preencha: nome do produto, descricao, preco e URL do site/landing page',
        'A URL e importante — e para la que os anuncios vao direcionar os clientes',
        'Voce pode cadastrar quantos produtos quiser e criar campanhas para cada um'
      ]
    },
    has_creative: {
      title: 'Como gerar criativos para anuncios',
      steps: [
        'Apos cadastrar um produto, peca no chat: "gere criativos para [nome do produto]"',
        'A IA vai gerar automaticamente imagens e textos para seus anuncios',
        'Voce vera um preview de cada criativo gerado',
        'Aprove pelo menos 1 criativo — so apos a aprovacao a campanha pode ser criada',
        'Voce pode pedir para gerar mais opcoes se nao gostar dos resultados'
      ]
    },
    payment_method: {
      title: 'Como configurar metodo de pagamento',
      steps: [
        'Acesse o Gerenciador de Anuncios do Meta (Ads Manager)',
        'Va em Configuracoes > Informacoes de pagamento',
        'Adicione um metodo de pagamento: cartao de credito, boleto bancario ou Pix',
        'Sem metodo de pagamento, suas campanhas nao serao veiculadas pelo Meta',
        'O Meta cobra diretamente na forma de pagamento configurada — o Vendedoria nao intermedia pagamentos'
      ],
      link: 'https://www.facebook.com/ads/manager/account_settings/account_billing/',
      linkText: 'Configurar pagamento no Ads Manager'
    },
    app_mode_live: {
      title: 'Como publicar o app Meta (modo Live)',
      steps: [
        'Acesse developers.facebook.com e selecione seu app',
        'No menu lateral, clique em "Publicar"',
        'O Meta pode pedir que voce complete a "Verificacao do app" antes de publicar',
        'Isso inclui: politica de privacidade, descricao do uso dos dados, e revisao de permissoes',
        'Apos aprovado, o app muda de "Desenvolvimento" para "Live" e pode ser usado por qualquer pessoa',
        'Enquanto estiver em Desenvolvimento, apenas usuarios de teste podem usar o app'
      ],
      link: 'https://developers.facebook.com/apps/',
      linkText: 'Abrir Meta for Developers'
    }
  };

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

  openHelpModal(key: string): void {
    const content = this.helpContent[key];
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
