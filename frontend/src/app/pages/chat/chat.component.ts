import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ChatService, ChatMessage } from '../../services/chat.service';
import { SettingsService } from '../../services/settings.service';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    RouterLink,
  ],
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss'],
})
export class ChatComponent implements OnInit, AfterViewChecked {
  @ViewChild('messagesContainer') messagesContainer!: ElementRef;

  messages: ChatMessage[] = [];
  newMessage = '';
  isLoading = false;
  selectedFile: File | null = null;
  aiConfigured = true;
  configStatus: any = {};
  private shouldScroll = false;

  suggestions = [
    'Quero vender um curso online',
    'Criar campanha no Meta Ads',
    'Disparar mensagens no WhatsApp',
    'Analisar meu mercado',
  ];

  constructor(
    private chatService: ChatService,
    private router: Router,
    private settingsService: SettingsService,
  ) {}

  ngOnInit(): void {
    this.settingsService.getStatus().subscribe({
      next: (status) => {
        this.configStatus = status;
        this.aiConfigured = status.ai_configured;
        if (this.aiConfigured) {
          this.loadHistory();
        }
      },
      error: () => {
        this.aiConfigured = true;
        this.loadHistory();
      },
    });
  }

  ngAfterViewChecked(): void {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  loadHistory(): void {
    this.chatService.getHistory().subscribe({
      next: (messages) => {
        this.messages = messages;
        this.shouldScroll = true;
      },
      error: () => {
        this.messages = [];
      },
    });
  }

  sendMessage(text?: string): void {
    const message = text || this.newMessage.trim();
    if (!message && !this.selectedFile) return;
    if (this.isLoading) return;

    // Add user message to UI immediately
    const userMsg: ChatMessage = {
      id: 0,
      role: 'user',
      content: message,
      created_at: new Date().toISOString(),
      attachment_path: this.selectedFile ? this.selectedFile.name : undefined,
      attachment_type: this.selectedFile ? this.getFileType(this.selectedFile.name) : undefined,
    };
    this.messages.push(userMsg);
    this.shouldScroll = true;

    this.isLoading = true;
    const file = this.selectedFile || undefined;
    this.newMessage = '';
    this.selectedFile = null;

    this.chatService.sendMessage(message, file).subscribe({
      next: (response: any) => {
        if (response.ai_fallback) {
          // No API key at all - block chat
          this.aiConfigured = false;
          this.messages = [];
          this.isLoading = false;
          this.chatService.clearHistory().subscribe();
          return;
        }
        if (response.ai_error) {
          // API key exists but API returned error - show error in chat, don't block
          const errorMsg: ChatMessage = {
            id: response.id || 0,
            role: 'assistant',
            content: response.content,
            created_at: response.created_at || new Date().toISOString(),
            is_error: true,
          };
          this.messages.push(errorMsg);
          this.isLoading = false;
          this.shouldScroll = true;
          return;
        }
        // Normal AI response
        this.messages.push(response);
        this.isLoading = false;
        this.shouldScroll = true;
      },
      error: () => {
        const errorMsg: ChatMessage = {
          id: 0,
          role: 'assistant',
          content: 'Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente.',
          created_at: new Date().toISOString(),
        };
        this.messages.push(errorMsg);
        this.isLoading = false;
        this.shouldScroll = true;
      },
    });
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  onSuggestionClick(suggestion: string): void {
    this.sendMessage(suggestion);
  }

  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
    }
    input.value = '';
  }

  removeFile(): void {
    this.selectedFile = null;
  }

  clearChat(): void {
    if (confirm('Tem certeza que deseja limpar toda a conversa?')) {
      this.chatService.clearHistory().subscribe({
        next: () => {
          this.messages = [];
        },
      });
    }
  }

  navigateToAction(action: string): void {
    const routes: Record<string, string> = {
      product_created: '/products',
      product_updated: '/products',
      product_deleted: '/products',
      creatives_generated: '/vendas',
      campaign_created: '/vendas',
      whatsapp_campaign_created: '/whatsapp',
      tiktok_campaign_created: '/vendas',
      strategy_generated: '/strategy',
      development_mode_error: '/settings',
      development_mode_warning: '/settings',
    };
    const route = routes[action];
    if (route) {
      this.router.navigate([route]);
    }
  }

  getActionLabel(action: string): string {
    const labels: Record<string, string> = {
      product_created: 'Produto criado',
      product_updated: 'Produto atualizado',
      product_deleted: 'Produto removido',
      creatives_generated: 'Criativos gerados',
      campaign_created: 'Campanha criada',
      whatsapp_campaign_created: 'Campanha WhatsApp criada',
      tiktok_campaign_created: 'Campanha TikTok criada',
      strategy_generated: 'Estrategia gerada',
      development_mode_error: 'App em modo Development',
      development_mode_warning: 'App em modo Development',
    };
    return labels[action] || action;
  }

  getActionClass(action: string): string {
    const classes: Record<string, string> = {
      product_created: 'product',
      product_updated: 'product',
      product_deleted: 'product',
      creatives_generated: 'creative',
      campaign_created: 'campaign',
      whatsapp_campaign_created: 'whatsapp',
      tiktok_campaign_created: 'tiktok',
      strategy_generated: 'strategy',
      development_mode_error: 'dev-mode',
      development_mode_warning: 'dev-mode',
    };
    return classes[action] || '';
  }

  getActionIcon(action: string): string {
    const icons: Record<string, string> = {
      product_created: 'check_circle',
      product_updated: 'edit',
      product_deleted: 'delete',
      creatives_generated: 'palette',
      campaign_created: 'bar_chart',
      whatsapp_campaign_created: 'chat',
      tiktok_campaign_created: 'music_note',
      strategy_generated: 'psychology',
      development_mode_error: 'warning',
      development_mode_warning: 'warning',
    };
    return icons[action] || 'info';
  }

  openMetaDevelopers(): void {
    window.open('https://developers.facebook.com/apps/', '_blank');
  }

  retryLiveMode(): void {
    this.sendMessage('Ja mudei para Live, pode tentar criar a campanha novamente');
  }

  isDevModeAction(action: string): boolean {
    return action === 'development_mode_error' || action === 'development_mode_warning';
  }

  getCreativePreviews(msg: ChatMessage): any[] {
    if (!msg.action_data) return [];
    try {
      const data = typeof msg.action_data === 'string' ? JSON.parse(msg.action_data) : msg.action_data;
      return data.previews || [];
    } catch {
      return [];
    }
  }

  approveCreative(msg: ChatMessage): void {
    try {
      const data = typeof msg.action_data === 'string' ? JSON.parse(msg.action_data) : msg.action_data;
      const creativeId = data.creative_ids?.[0];
      const productId = data.product_id;
      this.sendMessage(`Aprovado! Pode criar a campanha com o criativo ${creativeId} para o produto ${productId}`);
    } catch {
      this.sendMessage('Aprovado! Pode criar a campanha com esse criativo');
    }
  }

  regenerateCreative(msg: ChatMessage): void {
    this.sendMessage('Nao gostei, gere outro criativo diferente');
  }

  onPreviewImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
  }

  getAttachmentUrl(path: string | undefined): string {
    if (!path) return '';
    if (window.location.hostname === 'localhost') {
      return 'http://localhost:8001' + path;
    }
    return path;
  }

  formatContent(content: string): string {
    if (!content) return '';
    // Bold
    let formatted = content.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    // Italic
    formatted = formatted.replace(/\*(.+?)\*/g, '<em>$1</em>');
    // Markdown links [text](url) -> action button
    formatted = formatted.replace(/\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener" class="chat-action-btn"><span class="btn-icon">open_in_new</span> $1</a>');
    // Bare URLs -> clickable button (but not if already in an href)
    formatted = formatted.replace(/(?<!href="|">)(https?:\/\/[^\s<]+)/g,
      '<a href="$1" target="_blank" rel="noopener" class="chat-action-btn">$1 &#8599;</a>');
    // Line breaks
    formatted = formatted.replace(/\n/g, '<br>');
    return formatted;
  }

  private getFileType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return 'image';
    if (ext === 'csv') return 'csv';
    return 'file';
  }

  private scrollToBottom(): void {
    try {
      if (this.messagesContainer) {
        const el = this.messagesContainer.nativeElement;
        el.scrollTop = el.scrollHeight;
      }
    } catch (_) {}
  }
}
