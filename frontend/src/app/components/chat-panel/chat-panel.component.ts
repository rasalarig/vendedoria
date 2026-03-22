import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, NavigationEnd, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ChatService, ChatMessage } from '../../services/chat.service';
import { Subscription, filter } from 'rxjs';

@Component({
  selector: 'app-chat-panel',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    RouterLink,
  ],
  template: `
    <!-- Header -->
    <div class="panel-header">
      <div class="panel-header-left">
        <mat-icon class="panel-ai-icon">smart_toy</mat-icon>
        <span class="panel-title">Assistente IA</span>
        @if (currentContext) {
          <span class="context-badge">{{ currentContext }}</span>
        }
      </div>
      <div class="panel-header-actions">
        @if (messages.length > 0) {
          <button class="panel-icon-btn" (click)="clearChat()" matTooltip="Limpar historico">
            <mat-icon>delete_sweep</mat-icon>
          </button>
        }
        <button class="panel-icon-btn" (click)="collapse.emit()" matTooltip="Minimizar">
          <mat-icon>chevron_right</mat-icon>
        </button>
      </div>
    </div>

    @if (!aiConfigured) {
      <div class="panel-config-needed">
        <mat-icon class="config-icon">settings_suggest</mat-icon>
        <p>Configure sua chave de API de IA nas configuracoes.</p>
        <a routerLink="/settings" class="config-link">
          <mat-icon>settings</mat-icon>
          Configuracoes
        </a>
      </div>
    }

    @if (aiConfigured) {
      <!-- Welcome State -->
      @if (messages.length === 0 && !isLoading) {
        <div class="panel-welcome">
          <mat-icon class="welcome-icon">smart_toy</mat-icon>
          <h3>Ola! Sou o VendedorIA</h3>
          <p>Me conte o que voce quer vender!</p>
          <div class="panel-suggestions">
            @for (suggestion of suggestions; track suggestion) {
              <button class="suggestion-chip" (click)="onSuggestionClick(suggestion)">
                {{ suggestion }}
              </button>
            }
          </div>
        </div>
      }

      <!-- Messages Area -->
      @if (messages.length > 0 || isLoading) {
        <div class="panel-messages" #messagesContainer>
          @for (msg of messages; track msg.id || $index) {
            <div class="message" [class.user]="msg.role === 'user'" [class.assistant]="msg.role === 'assistant'">
              <div class="message-avatar"
                   [class.user-avatar]="msg.role === 'user'"
                   [class.ai-avatar]="msg.role === 'assistant'">
                <mat-icon>{{ msg.role === 'user' ? 'person' : 'smart_toy' }}</mat-icon>
              </div>
              <div class="message-content">
                @if (msg.is_error) {
                  <div class="error-indicator">
                    <mat-icon>error_outline</mat-icon>
                    <span>Erro da API</span>
                  </div>
                }
                <div class="message-bubble"
                     [class.user-bubble]="msg.role === 'user'"
                     [class.ai-bubble]="msg.role === 'assistant'"
                     [class.error-message]="msg.is_error"
                     [innerHTML]="formatContent(msg.content)">
                </div>

                @if (msg.attachment_path && msg.attachment_type === 'image') {
                  <img [src]="getAttachmentUrl(msg.attachment_path)"
                       class="message-image"
                       alt="Anexo">
                }

                @if (msg.action_taken) {
                  @if (isDevModeAction(msg.action_taken)) {
                    <div class="dev-mode-actions">
                      <button class="dev-mode-btn dev-mode-open" (click)="openMetaDevelopers()">
                        <mat-icon>open_in_new</mat-icon>
                        Meta Developers
                      </button>
                      <button class="dev-mode-btn dev-mode-retry" (click)="retryLiveMode()">
                        <mat-icon>refresh</mat-icon>
                        Ja mudei
                      </button>
                    </div>
                  } @else if (msg.action_taken === 'creatives_generated' && getCreativePreviews(msg).length > 0) {
                    <div class="creative-preview-card">
                      @for (preview of getCreativePreviews(msg); track preview.id) {
                        <div class="creative-preview">
                          @if (preview.image_url) {
                            <img [src]="preview.image_url"
                                 class="creative-preview-img"
                                 alt="Criativo"
                                 (error)="onPreviewImageError($event)">
                          }
                          <div class="creative-preview-info">
                            <div class="creative-preview-headline">{{ preview.headline }}</div>
                            <div class="creative-preview-copy">{{ preview.copy_text }}</div>
                            <div class="creative-preview-cta">{{ preview.cta }}</div>
                          </div>
                        </div>
                      }
                      <div class="creative-preview-actions">
                        <button class="creative-btn approve-btn"
                                (click)="approveCreative(msg)"
                                [disabled]="isLoading">
                          <mat-icon>check_circle</mat-icon>
                          Aprovar
                        </button>
                        <button class="creative-btn regenerate-btn"
                                (click)="regenerateCreative(msg)"
                                [disabled]="isLoading">
                          <mat-icon>refresh</mat-icon>
                          Outro
                        </button>
                      </div>
                    </div>
                  } @else {
                    <div class="action-badge"
                         [class]="'action-badge ' + getActionClass(msg.action_taken)"
                         (click)="navigateToAction(msg.action_taken)">
                      <mat-icon>{{ getActionIcon(msg.action_taken) }}</mat-icon>
                      {{ getActionLabel(msg.action_taken) }}
                      <mat-icon class="action-arrow">arrow_forward</mat-icon>
                    </div>
                  }
                }
              </div>
            </div>
          }

          @if (isLoading) {
            <div class="message assistant">
              <div class="message-avatar ai-avatar">
                <mat-icon>smart_toy</mat-icon>
              </div>
              <div class="message-bubble ai-bubble typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          }
        </div>
      }

      <!-- Input Area -->
      <div class="panel-input-area">
        @if (selectedFile) {
          <div class="attachment-preview">
            <mat-icon>attach_file</mat-icon>
            <span>{{ selectedFile.name }}</span>
            <mat-icon class="remove-attachment" (click)="removeFile()">close</mat-icon>
          </div>
        }
        <div class="input-row">
          <input type="file"
                 #fileInput
                 hidden
                 (change)="onFileSelect($event)"
                 accept="image/*,.csv,.pdf,.xlsx">
          <button class="panel-icon-btn attach-btn" (click)="fileInput.click()" [disabled]="isLoading"
                  matTooltip="Anexar arquivo">
            <mat-icon>attach_file</mat-icon>
          </button>
          <input class="message-input"
                 [(ngModel)]="newMessage"
                 (keydown)="onKeydown($event)"
                 placeholder="Digite sua mensagem..."
                 [disabled]="isLoading">
          <button class="send-btn"
                  (click)="sendMessage()"
                  [disabled]="(!newMessage.trim() && !selectedFile) || isLoading"
                  matTooltip="Enviar">
            <mat-icon>send</mat-icon>
          </button>
        </div>
      </div>
    }
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow: hidden;
      background: #0a0a0f;
    }

    /* Header */
    .panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      border-bottom: 1px solid #27272a;
      background: #09090b;
      flex-shrink: 0;
    }

    .panel-header-left {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
    }

    .panel-ai-icon {
      color: #22c55e;
      font-size: 18px;
      width: 18px;
      height: 18px;
      flex-shrink: 0;
    }

    .panel-title {
      font-size: 14px;
      font-weight: 600;
      color: #fafafa;
      white-space: nowrap;
    }

    .context-badge {
      font-size: 11px;
      color: #a1a1aa;
      background: #18181b;
      padding: 2px 8px;
      border-radius: 6px;
      border: 1px solid #27272a;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 120px;
    }

    .panel-header-actions {
      display: flex;
      align-items: center;
      gap: 4px;
      flex-shrink: 0;
    }

    .panel-icon-btn {
      background: none;
      border: none;
      cursor: pointer;
      padding: 4px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.15s ease;
      color: #52525b;

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }

      &:hover {
        background: rgba(139, 92, 246, 0.1);
        color: #a1a1aa;
      }

      &:disabled {
        opacity: 0.4;
        cursor: default;
      }
    }

    /* Config needed */
    .panel-config-needed {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px;
      text-align: center;
      gap: 12px;

      .config-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        color: #8b5cf6;
      }

      p {
        color: #71717a;
        font-size: 13px;
        margin: 0;
        line-height: 1.5;
      }

      .config-link {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        color: #8b5cf6;
        text-decoration: none;
        font-size: 13px;
        font-weight: 500;
        padding: 8px 16px;
        border-radius: 8px;
        border: 1px solid rgba(139, 92, 246, 0.3);
        transition: all 0.2s;

        mat-icon {
          font-size: 16px;
          width: 16px;
          height: 16px;
        }

        &:hover {
          background: rgba(139, 92, 246, 0.1);
        }
      }
    }

    /* Welcome */
    .panel-welcome {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      text-align: center;
      padding: 24px 16px;

      .welcome-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        background: linear-gradient(135deg, #8b5cf6, #ec4899);
        -webkit-background-clip: text;
        background-clip: text;
        -webkit-text-fill-color: transparent;
      }

      h3 {
        color: #fafafa;
        font-weight: 700;
        font-size: 18px;
        margin: 0;
        letter-spacing: -0.3px;
      }

      p {
        color: #71717a;
        font-size: 13px;
        margin: 0;
      }
    }

    .panel-suggestions {
      display: flex;
      flex-direction: column;
      gap: 8px;
      width: 100%;
      margin-top: 8px;
    }

    .suggestion-chip {
      background: transparent;
      border: 1px solid #3f3f46;
      color: #a1a1aa;
      padding: 10px 16px;
      border-radius: 12px;
      cursor: pointer;
      font-size: 13px;
      font-family: 'Inter', sans-serif;
      transition: all 0.2s ease;
      text-align: left;

      &:hover {
        border-color: #8b5cf6;
        color: #fafafa;
        background: rgba(139, 92, 246, 0.06);
      }
    }

    /* Messages */
    .panel-messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px 12px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .message {
      max-width: 90%;
      display: flex;
      gap: 8px;

      &.user {
        align-self: flex-end;
        flex-direction: row-reverse;
      }

      &.assistant {
        align-self: flex-start;
      }
    }

    .message-content {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    .message-avatar {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;

      &.user-avatar {
        background: linear-gradient(135deg, #8b5cf6, #ec4899);
      }

      &.ai-avatar {
        background: linear-gradient(135deg, #8b5cf6, #3b82f6);
      }

      mat-icon {
        color: white;
        font-size: 16px;
        width: 16px;
        height: 16px;
      }
    }

    .message-bubble {
      padding: 10px 14px;
      border-radius: 14px;
      line-height: 1.5;
      font-size: 13px;
      word-wrap: break-word;
      overflow-wrap: break-word;

      &.user-bubble {
        background: linear-gradient(135deg, #8b5cf6, #7c3aed);
        color: white;
        border-bottom-right-radius: 4px;
      }

      &.ai-bubble {
        background: rgba(24, 24, 27, 0.8);
        backdrop-filter: blur(12px);
        border: 1px solid rgba(63, 63, 70, 0.5);
        color: #e4e4e7;
        border-bottom-left-radius: 4px;
      }
    }

    .error-message {
      border-left: 3px solid #ef4444 !important;
      background: rgba(239, 68, 68, 0.08) !important;
    }

    .error-indicator {
      display: flex;
      align-items: center;
      gap: 4px;
      margin-bottom: 4px;
      font-size: 11px;
      color: #ef4444;

      mat-icon {
        font-size: 14px;
        width: 14px;
        height: 14px;
      }
    }

    .message-image {
      max-width: 180px;
      border-radius: 10px;
      margin-top: 6px;
      border: 1px solid #27272a;
    }

    /* Action badges */
    .action-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 6px 10px;
      border-radius: 8px;
      margin-top: 6px;
      font-size: 12px;
      cursor: pointer;
      transition: all 0.2s;
      width: fit-content;
      border: 1px solid transparent;

      &:hover { transform: translateY(-1px); }

      &.product {
        background: rgba(34, 197, 94, 0.1);
        color: #22c55e;
        border-color: rgba(34, 197, 94, 0.2);
      }
      &.creative {
        background: rgba(139, 92, 246, 0.1);
        color: #a78bfa;
        border-color: rgba(139, 92, 246, 0.2);
      }
      &.campaign {
        background: rgba(59, 130, 246, 0.1);
        color: #60a5fa;
        border-color: rgba(59, 130, 246, 0.2);
      }
      &.strategy {
        background: rgba(245, 158, 11, 0.1);
        color: #f59e0b;
        border-color: rgba(245, 158, 11, 0.2);
      }

      mat-icon {
        font-size: 14px;
        width: 14px;
        height: 14px;
      }

      .action-arrow {
        font-size: 12px;
        width: 12px;
        height: 12px;
      }
    }

    /* Typing indicator */
    .typing-indicator {
      display: flex;
      gap: 4px;
      padding: 10px 14px;
      align-items: center;

      span {
        width: 6px;
        height: 6px;
        background: #8b5cf6;
        border-radius: 50%;
        animation: typing 1.4s infinite;

        &:nth-child(2) { animation-delay: 0.2s; }
        &:nth-child(3) { animation-delay: 0.4s; }
      }
    }

    @keyframes typing {
      0%, 60%, 100% { opacity: 0.3; transform: scale(0.8); }
      30% { opacity: 1; transform: scale(1); }
    }

    /* Dev mode actions */
    .dev-mode-actions {
      display: flex;
      gap: 6px;
      margin-top: 6px;
      flex-wrap: wrap;
    }

    .dev-mode-btn {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 6px 10px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      border: 1px solid;
      transition: all 0.2s ease;

      mat-icon {
        font-size: 14px;
        width: 14px;
        height: 14px;
      }
    }

    .dev-mode-open {
      background: rgba(245, 158, 11, 0.1);
      border-color: rgba(245, 158, 11, 0.3);
      color: #f59e0b;
      &:hover { background: rgba(245, 158, 11, 0.2); border-color: #f59e0b; }
    }

    .dev-mode-retry {
      background: rgba(34, 197, 94, 0.1);
      border-color: rgba(34, 197, 94, 0.3);
      color: #22c55e;
      &:hover { background: rgba(34, 197, 94, 0.2); border-color: #22c55e; }
    }

    /* Creative preview */
    .creative-preview-card {
      margin-top: 6px;
      border-radius: 10px;
      overflow: hidden;
      border: 1px solid #27272a;
      background: #18181b;
    }

    .creative-preview {
      .creative-preview-img {
        width: 100%;
        max-height: 200px;
        object-fit: cover;
        display: block;
      }

      .creative-preview-info {
        padding: 8px 12px;

        .creative-preview-headline {
          font-weight: 600;
          font-size: 13px;
          color: #f4f4f5;
          margin-bottom: 4px;
        }
        .creative-preview-copy {
          font-size: 12px;
          color: #a1a1aa;
          line-height: 1.4;
          margin-bottom: 4px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .creative-preview-cta {
          font-size: 11px;
          color: #8b5cf6;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
      }
    }

    .creative-preview-actions {
      display: flex;
      gap: 6px;
      padding: 8px 12px;
      border-top: 1px solid #27272a;

      .creative-btn {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 4px;
        padding: 8px 10px;
        border: none;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
        font-family: 'Inter', sans-serif;

        mat-icon {
          font-size: 16px;
          width: 16px;
          height: 16px;
        }

        &:disabled { opacity: 0.5; cursor: not-allowed; }
      }

      .approve-btn {
        background: #22c55e;
        color: #fff;
        &:hover:not(:disabled) { background: #16a34a; }
      }

      .regenerate-btn {
        background: #27272a;
        color: #a1a1aa;
        &:hover:not(:disabled) { background: #3f3f46; color: #f4f4f5; }
      }
    }

    /* Input area */
    .panel-input-area {
      padding: 12px;
      background: #18181b;
      border-top: 1px solid #27272a;
      flex-shrink: 0;
    }

    .attachment-preview {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      background: rgba(139, 92, 246, 0.1);
      border: 1px solid rgba(139, 92, 246, 0.2);
      border-radius: 8px;
      font-size: 11px;
      color: #a78bfa;
      margin-bottom: 8px;

      mat-icon {
        font-size: 14px;
        width: 14px;
        height: 14px;
      }

      span {
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .remove-attachment {
        cursor: pointer;
        font-size: 14px;
        width: 14px;
        height: 14px;
        transition: color 0.15s;
        &:hover { color: #ef4444; }
      }
    }

    .input-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .message-input {
      flex: 1;
      background: #09090b;
      border: 1px solid #3f3f46;
      border-radius: 20px;
      padding: 10px 16px;
      color: #fafafa;
      font-size: 13px;
      outline: none;
      font-family: 'Inter', sans-serif;
      transition: border-color 0.15s ease;
      min-width: 0;

      &:focus {
        border-color: #8b5cf6;
        box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.1);
      }

      &::placeholder { color: #52525b; }
      &:disabled { opacity: 0.5; }
    }

    .attach-btn {
      flex-shrink: 0;
    }

    .send-btn {
      flex-shrink: 0;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      border: none;
      background: linear-gradient(135deg, #8b5cf6, #ec4899);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: opacity 0.15s, transform 0.15s;
      box-shadow: 0 2px 8px rgba(139, 92, 246, 0.3);

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }

      &:hover:not(:disabled) {
        transform: scale(1.05);
      }

      &:disabled {
        opacity: 0.4;
        cursor: default;
      }
    }

    /* Action button links rendered via innerHTML */
    :host ::ng-deep .chat-action-btn {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 6px 12px;
      margin: 2px 1px;
      background: #1877f2;
      color: white !important;
      border-radius: 6px;
      text-decoration: none;
      font-size: 12px;
      font-weight: 500;
      transition: background 0.2s;
      cursor: pointer;

      &:hover {
        background: #166fe5;
        text-decoration: none;
      }

      .btn-icon {
        font-family: 'Material Icons';
        font-size: 14px;
        width: 14px;
        height: 14px;
        line-height: 1;
      }
    }

    /* Mobile overlay mode */
    @media (max-width: 767px) {
      :host {
        border-radius: 0;
      }
    }
  `],
})
export class ChatPanelComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('messagesContainer') messagesContainer!: ElementRef;
  @Output() collapse = new EventEmitter<void>();

  messages: ChatMessage[] = [];
  newMessage = '';
  isLoading = false;
  selectedFile: File | null = null;
  aiConfigured = true;
  currentContext = '';
  private shouldScroll = false;
  private routerSub!: Subscription;

  suggestions = [
    'Quero vender um curso online',
    'Criar campanha no Meta Ads',
    'Disparar mensagens no WhatsApp',
    'Analisar meu mercado',
  ];

  private contextMap: Record<string, string> = {
    '/home': 'Inicio',
    '/sellers': 'Vendedores',
    '/products': 'Produtos',
    '/videos': 'Videos',
    '/vendas': 'Vendas',
    '/dashboard': 'Metricas',
    '/settings': 'Configuracoes',
    '/whatsapp': 'WhatsApp',
    '/leads': 'Leads',
    '/strategy': 'Estrategia',
    '/analytics': 'Analytics',
    '/wizard': 'Wizard',
  };

  constructor(
    private chatService: ChatService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.aiConfigured = true;
    this.loadHistory();

    this.updateContext(this.router.url);
    this.routerSub = this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e) => {
        this.updateContext((e as NavigationEnd).urlAfterRedirects);
      });
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
  }

  ngAfterViewChecked(): void {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  private updateContext(url: string): void {
    const path = '/' + (url.split('/')[1] || '');
    this.currentContext = this.contextMap[path] || '';
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
        if (response.ai_error) {
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
        this.messages.push(response);
        this.isLoading = false;
        this.shouldScroll = true;
      },
      error: () => {
        const errorMsg: ChatMessage = {
          id: 0,
          role: 'assistant',
          content: 'Desculpe, ocorreu um erro. Tente novamente.',
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
      whatsapp_campaign_created: 'WhatsApp criada',
      tiktok_campaign_created: 'TikTok criada',
      strategy_generated: 'Estrategia gerada',
      development_mode_error: 'Modo Development',
      development_mode_warning: 'Modo Development',
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
      return 'http://localhost:8000' + path;
    }
    return path;
  }

  formatContent(content: string): string {
    if (!content) return '';
    let formatted = content.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/\*(.+?)\*/g, '<em>$1</em>');
    formatted = formatted.replace(/\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener" class="chat-action-btn"><span class="btn-icon">open_in_new</span> $1</a>');
    formatted = formatted.replace(/(?<!href="|">)(https?:\/\/[^\s<]+)/g,
      '<a href="$1" target="_blank" rel="noopener" class="chat-action-btn">$1 &#8599;</a>');
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
