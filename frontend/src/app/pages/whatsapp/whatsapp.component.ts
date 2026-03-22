import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { WhatsAppService, Contact, WhatsAppCampaign, WhatsAppMessage } from '../../services/whatsapp.service';
import { ProductService, Product } from '../../services/product.service';
import { ContactDialogComponent } from './contact-dialog.component';

@Component({
  selector: 'app-whatsapp',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatTabsModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatChipsModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDialogModule,
    MatTooltipModule,
    MatDividerModule,
  ],
  template: `
    <div class="whatsapp-page">
      <h1><mat-icon class="page-icon">whatsapp</mat-icon> Campanhas WhatsApp</h1>

      <mat-tab-group animationDuration="200ms" class="whatsapp-tabs">
        <!-- Tab 1: Contatos -->
        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon>contacts</mat-icon>
            <span class="tab-label">Contatos</span>
          </ng-template>

          <div class="tab-content">
            <!-- Actions bar -->
            <div class="actions-bar">
              <div class="actions-left">
                <button mat-flat-button color="primary" (click)="openAddContactDialog()">
                  <mat-icon>person_add</mat-icon> Adicionar Contato
                </button>
                <button mat-stroked-button class="import-btn" (click)="csvFileInput.click()">
                  <mat-icon>upload_file</mat-icon> Importar CSV
                </button>
                <input #csvFileInput type="file" accept=".csv" hidden (change)="onCsvFileSelected($event)">
              </div>
              <div class="actions-right">
                <mat-form-field appearance="outline" class="filter-field">
                  <mat-label>Filtrar por tag</mat-label>
                  <input matInput [(ngModel)]="tagFilter" (keyup.enter)="loadContacts()" placeholder="Ex: cliente">
                  <button matSuffix mat-icon-button (click)="loadContacts()" matTooltip="Filtrar">
                    <mat-icon>search</mat-icon>
                  </button>
                </mat-form-field>
              </div>
            </div>

            <div class="contact-count">
              <mat-icon>people</mat-icon>
              <span>{{ contacts.length }} contato{{ contacts.length !== 1 ? 's' : '' }}</span>
            </div>

            @if (loadingContacts) {
              <div class="loading-state">
                <mat-spinner diameter="40"></mat-spinner>
                <p>Carregando contatos...</p>
              </div>
            } @else if (contacts.length === 0) {
              <div class="empty-state">
                <mat-icon class="empty-icon">contacts</mat-icon>
                <p>Nenhum contato cadastrado</p>
                <p class="empty-hint">Adicione contatos manualmente ou importe um arquivo CSV</p>
              </div>
            } @else {
              <div class="table-container">
                <table class="contacts-table">
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>Telefone</th>
                      <th>Tags</th>
                      <th>Status</th>
                      <th>Acoes</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (contact of contacts; track contact.id) {
                      <tr>
                        <td>{{ contact.name }}</td>
                        <td class="phone-cell">{{ contact.phone }}</td>
                        <td>
                          <div class="tags-cell">
                            @for (tag of getTagArray(contact.tags); track tag) {
                              <span class="tag-chip">{{ tag }}</span>
                            }
                          </div>
                        </td>
                        <td>
                          <span class="contact-status" [ngClass]="'contact-status-' + contact.status">
                            {{ contact.status }}
                          </span>
                        </td>
                        <td>
                          <button mat-icon-button class="delete-btn" (click)="deleteContact(contact)"
                                  matTooltip="Excluir contato">
                            <mat-icon>delete</mat-icon>
                          </button>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </div>
        </mat-tab>

        <!-- Tab 2: Criar Campanha -->
        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon>create</mat-icon>
            <span class="tab-label">Criar Campanha</span>
          </ng-template>

          <div class="tab-content">
            <mat-card class="create-campaign-card">
              <mat-card-content>
                <div class="form-row">
                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Nome da Campanha</mat-label>
                    <input matInput [(ngModel)]="newCampaign.name" placeholder="Ex: Lancamento Produto X">
                  </mat-form-field>
                </div>

                <div class="form-row">
                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Produto (opcional)</mat-label>
                    <mat-select [(value)]="newCampaign.product_id" (selectionChange)="onProductSelected()">
                      <mat-option [value]="null">Nenhum produto</mat-option>
                      @for (product of products; track product.id) {
                        <mat-option [value]="product.id">{{ product.name }} - R$ {{ product.price | number:'1.2-2' }}</mat-option>
                      }
                    </mat-select>
                    <mat-hint>Selecionar um produto preenche automaticamente as variaveis</mat-hint>
                  </mat-form-field>
                </div>

                <!-- Template variables -->
                <div class="template-section">
                  <label class="section-label">Template da Mensagem</label>
                  <div class="variable-buttons">
                    <button mat-stroked-button class="var-chip" (click)="insertVariable('{nome}')">
                      &#123;nome&#125;
                    </button>
                    <button mat-stroked-button class="var-chip" (click)="insertVariable('{produto}')">
                      &#123;produto&#125;
                    </button>
                    <button mat-stroked-button class="var-chip" (click)="insertVariable('{preco}')">
                      &#123;preco&#125;
                    </button>
                  </div>
                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Mensagem</mat-label>
                    <textarea #templateInput matInput [(ngModel)]="newCampaign.template_text" rows="6"
                              placeholder="Ola {nome}! Temos uma oferta especial do {produto} por apenas {preco}. Aproveite!"></textarea>
                  </mat-form-field>
                </div>

                <!-- Preview -->
                @if (newCampaign.template_text) {
                  <div class="preview-section">
                    <label class="section-label">Pre-visualizacao</label>
                    <div class="message-preview">
                      <div class="preview-bubble">
                        {{ getPreviewText() }}
                      </div>
                    </div>
                  </div>
                }

                <mat-divider></mat-divider>

                <!-- Contact selection -->
                <div class="contact-selection">
                  <label class="section-label">Selecionar Contatos</label>
                  <div class="selection-options">
                    <mat-form-field appearance="outline" class="full-width">
                      <mat-label>Filtrar por tags (deixe vazio para todos)</mat-label>
                      <input matInput [(ngModel)]="newCampaign.tag_filter"
                             placeholder="Ex: cliente, vip">
                      <mat-hint>Separe tags por virgula. Vazio = todos os contatos ativos</mat-hint>
                    </mat-form-field>
                  </div>
                  <div class="contact-count-preview">
                    <mat-icon>group</mat-icon>
                    <span>{{ contacts.length }} contato{{ contacts.length !== 1 ? 's' : '' }} serao contactados</span>
                  </div>
                </div>

                <div class="form-actions">
                  <button mat-flat-button color="primary" class="create-btn"
                          [disabled]="!canCreateCampaign() || creatingCampaign"
                          (click)="createCampaign()">
                    @if (creatingCampaign) {
                      <mat-spinner diameter="20" class="btn-spinner"></mat-spinner>
                      <span>Criando...</span>
                    } @else {
                      <mat-icon>send</mat-icon>
                      <span>Criar Campanha</span>
                    }
                  </button>
                </div>
              </mat-card-content>
            </mat-card>
          </div>
        </mat-tab>

        <!-- Tab 3: Campanhas -->
        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon>campaign</mat-icon>
            <span class="tab-label">Campanhas</span>
          </ng-template>

          <div class="tab-content">
            @if (loadingCampaigns) {
              <div class="loading-state">
                <mat-spinner diameter="40"></mat-spinner>
                <p>Carregando campanhas...</p>
              </div>
            } @else if (campaigns.length === 0) {
              <div class="empty-state">
                <mat-icon class="empty-icon">campaign</mat-icon>
                <p>Nenhuma campanha WhatsApp criada</p>
                <p class="empty-hint">Use a aba "Criar Campanha" para comecar</p>
              </div>
            } @else {
              <div class="campaigns-grid">
                @for (campaign of campaigns; track campaign.id) {
                  <mat-card class="wa-campaign-card">
                    <mat-card-header>
                      <mat-card-title class="campaign-title">{{ campaign.name }}</mat-card-title>
                      <mat-card-subtitle>
                        @if (campaign.product_name) {
                          {{ campaign.product_name }}
                        }
                      </mat-card-subtitle>
                    </mat-card-header>

                    <!-- Status badge -->
                    <div class="wa-status-badge" [ngClass]="'wa-status-' + campaign.status">
                      {{ getStatusLabel(campaign.status) }}
                    </div>

                    <mat-card-content>
                      <!-- Progress bar -->
                      <div class="progress-section">
                        <div class="progress-label">
                          <span>{{ campaign.sent_count }}/{{ campaign.total_contacts }} enviadas</span>
                          <span>{{ getProgressPercent(campaign) }}%</span>
                        </div>
                        <mat-progress-bar mode="determinate"
                                          [value]="getProgressPercent(campaign)"
                                          class="campaign-progress">
                        </mat-progress-bar>
                      </div>

                      <!-- Stats row -->
                      <div class="stats-row">
                        <div class="stat-item">
                          <span class="stat-value stat-sent">{{ campaign.sent_count }}</span>
                          <span class="stat-label">Enviadas</span>
                        </div>
                        <div class="stat-item">
                          <span class="stat-value stat-delivered">{{ campaign.delivered_count }}</span>
                          <span class="stat-label">Entregues</span>
                        </div>
                        <div class="stat-item">
                          <span class="stat-value stat-read">{{ campaign.read_count }}</span>
                          <span class="stat-label">Lidas</span>
                        </div>
                        <div class="stat-item">
                          <span class="stat-value stat-replied">{{ campaign.replied_count }}</span>
                          <span class="stat-label">Respondidas</span>
                        </div>
                        <div class="stat-item">
                          <span class="stat-value stat-error">{{ campaign.error_count }}</span>
                          <span class="stat-label">Erros</span>
                        </div>
                      </div>

                      <!-- Date -->
                      <div class="campaign-date">
                        <mat-icon>schedule</mat-icon>
                        <span>{{ campaign.created_at | date:'dd/MM/yyyy HH:mm' }}</span>
                      </div>
                    </mat-card-content>

                    <mat-card-actions>
                      @if (campaign.status === 'draft' || campaign.status === 'paused') {
                        <button mat-flat-button color="primary" class="send-btn"
                                [disabled]="sendingCampaignId === campaign.id"
                                (click)="sendCampaign(campaign)">
                          @if (sendingCampaignId === campaign.id) {
                            <mat-spinner diameter="18" class="btn-spinner"></mat-spinner>
                            <span>Enviando...</span>
                          } @else {
                            <mat-icon>send</mat-icon> Enviar Agora
                          }
                        </button>
                      }
                      @if (campaign.status === 'sending') {
                        <button mat-button class="pause-btn" (click)="pauseCampaign(campaign)">
                          <mat-icon>pause_circle</mat-icon> Pausar
                        </button>
                      }
                      <button mat-button class="detail-btn" (click)="viewDetails(campaign)">
                        <mat-icon>visibility</mat-icon> Detalhes
                      </button>
                    </mat-card-actions>

                    <!-- Expandable details -->
                    @if (expandedCampaignId === campaign.id && campaign.messages) {
                      <div class="campaign-messages-detail">
                        <mat-divider></mat-divider>
                        <h4>Mensagens ({{ campaign.messages.length }})</h4>
                        <div class="messages-list">
                          @for (msg of campaign.messages; track msg.id) {
                            <div class="message-row">
                              <div class="msg-contact">
                                <strong>{{ msg.contact_name }}</strong>
                                <span class="msg-phone">{{ msg.contact_phone }}</span>
                              </div>
                              <span class="msg-status" [ngClass]="'msg-status-' + msg.status">
                                {{ getMsgStatusLabel(msg.status) }}
                              </span>
                            </div>
                          }
                        </div>
                      </div>
                    }
                  </mat-card>
                }
              </div>
            }
          </div>
        </mat-tab>
      </mat-tab-group>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      padding: 32px;
    }

    h1 {
      font-size: 32px;
      font-weight: 800;
      color: #fafafa;
      margin: 0 0 28px;
      display: flex;
      align-items: center;
      gap: 12px;
      letter-spacing: -1px;
    }

    .page-icon {
      color: #22c55e;
      font-size: 32px;
      width: 32px;
      height: 32px;
    }

    .whatsapp-tabs {
      ::ng-deep .mat-mdc-tab-header {
        background: #18181b;
        border-radius: 14px 14px 0 0;
        border-bottom: 1px solid #27272a;
      }

      ::ng-deep .mat-mdc-tab:not(.mdc-tab--active) .mdc-tab__text-label {
        color: #71717a !important;
      }

      ::ng-deep .mat-mdc-tab.mdc-tab--active .mdc-tab__text-label {
        color: #22c55e !important;
      }

      ::ng-deep .mdc-tab-indicator__content--underline {
        border-color: #22c55e !important;
      }
    }

    .tab-label {
      margin-left: 8px;
    }

    .tab-content {
      padding: 24px 0;
    }

    /* Actions bar */
    .actions-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
      margin-bottom: 16px;
    }

    .actions-left {
      display: flex;
      gap: 12px;
      align-items: center;
    }

    .import-btn {
      color: #22c55e !important;
      border-color: #22c55e !important;
    }

    .filter-field {
      min-width: 250px;

      ::ng-deep .mat-mdc-text-field-wrapper {
        background: #09090b !important;
      }

      ::ng-deep .mat-mdc-floating-label,
      ::ng-deep .mdc-text-field__input {
        color: #a1a1aa !important;
      }

      ::ng-deep .mdc-notched-outline__leading,
      ::ng-deep .mdc-notched-outline__notch,
      ::ng-deep .mdc-notched-outline__trailing {
        border-color: #3f3f46 !important;
      }
    }

    .contact-count {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #71717a;
      font-size: 14px;
      margin-bottom: 16px;
    }

    /* Loading/Empty states */
    .loading-state {
      text-align: center;
      padding: 40px;
      color: #71717a;
      p { margin-top: 12px; }
      mat-spinner { margin: 0 auto; }
    }

    .empty-state {
      text-align: center;
      padding: 60px 20px;
      color: #71717a;
      .empty-icon {
        font-size: 64px; width: 64px; height: 64px;
        opacity: 0.3; margin-bottom: 12px;
      }
      p { font-size: 16px; margin: 4px 0; }
      .empty-hint { font-size: 13px; opacity: 0.7; }
    }

    /* Contacts Table */
    .table-container {
      overflow-x: auto;
    }

    .contacts-table {
      width: 100%;
      border-collapse: collapse;

      th {
        text-align: left;
        padding: 12px 16px;
        color: #71717a;
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        border-bottom: 1px solid #27272a;
        background: #09090b;
      }

      td {
        padding: 12px 16px;
        color: #a1a1aa;
        border-bottom: 1px solid #27272a;
        font-size: 14px;
      }

      tbody tr {
        transition: background 0.15s;

        &:nth-child(even) {
          background: rgba(15, 26, 48, 0.5);
        }

        &:hover {
          background: rgba(37, 211, 102, 0.05);
        }
      }
    }

    .phone-cell {
      font-family: 'Roboto Mono', monospace;
      color: #a1a1aa;
    }

    .tags-cell {
      display: flex;
      gap: 4px;
      flex-wrap: wrap;
    }

    .tag-chip {
      background: rgba(37, 211, 102, 0.15);
      color: #22c55e;
      padding: 2px 10px;
      border-radius: 12px;
      font-size: 12px;
    }

    .contact-status {
      font-size: 12px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 4px;
    }

    .contact-status-active {
      background: rgba(76, 175, 80, 0.2);
      color: #4caf50;
    }

    .contact-status-blocked {
      background: rgba(244, 67, 54, 0.2);
      color: #f44336;
    }

    .contact-status-opted_out {
      background: rgba(158, 158, 158, 0.2);
      color: #9e9e9e;
    }

    .delete-btn {
      color: #f44336 !important;
    }

    /* Create Campaign Form */
    .create-campaign-card {
      background: #18181b !important;
      border-radius: 16px !important;
      color: white;
      max-width: 800px;
    }

    .form-row {
      margin-bottom: 8px;
    }

    .full-width {
      width: 100%;
    }

    .section-label {
      display: block;
      color: #a1a1aa;
      font-size: 13px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 12px;
      margin-top: 16px;
    }

    .variable-buttons {
      display: flex;
      gap: 8px;
      margin-bottom: 12px;
    }

    .var-chip {
      color: #22c55e !important;
      border-color: #22c55e !important;
      font-family: 'Roboto Mono', monospace;
      font-size: 13px;
    }

    /* Form fields dark styling */
    .create-campaign-card mat-form-field {
      ::ng-deep .mat-mdc-text-field-wrapper {
        background: #09090b !important;
      }

      ::ng-deep .mat-mdc-select-value,
      ::ng-deep .mat-mdc-floating-label,
      ::ng-deep .mat-mdc-select-arrow,
      ::ng-deep .mdc-text-field__input {
        color: #a1a1aa !important;
      }

      ::ng-deep .mdc-notched-outline__leading,
      ::ng-deep .mdc-notched-outline__notch,
      ::ng-deep .mdc-notched-outline__trailing {
        border-color: #3f3f46 !important;
      }

      ::ng-deep .mat-mdc-form-field-hint {
        color: #71717a !important;
      }
    }

    /* Template textarea monospace */
    .template-section {
      ::ng-deep textarea {
        font-family: 'Roboto Mono', monospace !important;
        font-size: 14px !important;
        line-height: 1.6 !important;
      }
    }

    /* Preview */
    .preview-section {
      margin: 16px 0;
    }

    .message-preview {
      background: #0a1020;
      border-radius: 12px;
      padding: 20px;
    }

    .preview-bubble {
      background: #005c4b;
      color: #e9edef;
      padding: 12px 16px;
      border-radius: 8px 8px 8px 0;
      max-width: 400px;
      font-size: 14px;
      line-height: 1.6;
      white-space: pre-wrap;
    }

    .contact-selection {
      margin-top: 20px;
    }

    .contact-count-preview {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #22c55e;
      font-size: 14px;
      margin-top: 8px;
    }

    .form-actions {
      margin-top: 24px;
    }

    .create-btn, .send-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      background-color: #22c55e !important;
      color: #fff !important;
    }

    .btn-spinner {
      display: inline-block;
    }

    mat-divider {
      border-color: #27272a !important;
      margin: 20px 0 !important;
    }

    /* Campaigns Grid */
    .campaigns-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
      gap: 20px;
    }

    .wa-campaign-card {
      background: #18181b !important;
      border-radius: 16px !important;
      color: white;
      position: relative;
      border: 1px solid #27272a;
    }

    .campaign-title {
      color: #ffffff !important;
      font-size: 16px !important;
    }

    .wa-status-badge {
      position: absolute;
      top: 16px;
      right: 16px;
      font-size: 11px;
      font-weight: 700;
      padding: 4px 12px;
      border-radius: 20px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .wa-status-draft {
      background: rgba(158, 158, 158, 0.2);
      color: #9e9e9e;
    }

    .wa-status-sending {
      background: rgba(33, 150, 243, 0.2);
      color: #2196f3;
    }

    .wa-status-completed {
      background: rgba(76, 175, 80, 0.2);
      color: #4caf50;
    }

    .wa-status-paused {
      background: rgba(255, 193, 7, 0.2);
      color: #ffc107;
    }

    .wa-status-error {
      background: rgba(244, 67, 54, 0.2);
      color: #f44336;
    }

    /* Progress */
    .progress-section {
      margin: 16px 0 20px;
    }

    .progress-label {
      display: flex;
      justify-content: space-between;
      color: #71717a;
      font-size: 13px;
      margin-bottom: 8px;
    }

    .campaign-progress {
      ::ng-deep .mdc-linear-progress__bar-inner {
        border-color: #22c55e !important;
      }

      ::ng-deep .mdc-linear-progress__buffer-bar {
        background-color: #27272a !important;
      }
    }

    /* Stats row */
    .stats-row {
      display: flex;
      justify-content: space-around;
      gap: 8px;
      margin: 16px 0;
    }

    .stat-item {
      text-align: center;

      .stat-value {
        display: block;
        font-size: 18px;
        font-weight: 600;
      }

      .stat-label {
        display: block;
        font-size: 10px;
        color: #71717a;
        text-transform: uppercase;
        margin-top: 2px;
      }
    }

    .stat-sent { color: #2196f3; }
    .stat-delivered { color: #00bcd4; }
    .stat-read { color: #4caf50; }
    .stat-replied { color: #9c27b0; }
    .stat-error { color: #f44336; }

    .campaign-date {
      display: flex;
      align-items: center;
      gap: 6px;
      color: #52525b;
      font-size: 12px;
      margin-top: 8px;

      mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
      }
    }

    mat-card-actions {
      padding: 8px 16px 16px !important;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .pause-btn { color: #ffc107 !important; }
    .detail-btn { color: #8b5cf6 !important; }

    ::ng-deep mat-card-subtitle {
      color: #71717a !important;
    }

    /* Campaign messages detail */
    .campaign-messages-detail {
      padding: 0 16px 16px;

      h4 {
        color: #a1a1aa;
        font-size: 14px;
        margin: 12px 0;
      }
    }

    .messages-list {
      max-height: 300px;
      overflow-y: auto;
    }

    .message-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 12px;
      border-bottom: 1px solid #27272a;
      font-size: 13px;

      &:last-child {
        border-bottom: none;
      }
    }

    .msg-contact {
      display: flex;
      flex-direction: column;

      strong {
        color: #a1a1aa;
      }

      .msg-phone {
        color: #52525b;
        font-size: 12px;
        font-family: 'Roboto Mono', monospace;
      }
    }

    .msg-status {
      font-size: 11px;
      font-weight: 600;
      padding: 2px 10px;
      border-radius: 12px;
    }

    .msg-status-pending {
      background: rgba(158, 158, 158, 0.2);
      color: #9e9e9e;
    }

    .msg-status-sent {
      background: rgba(33, 150, 243, 0.2);
      color: #2196f3;
    }

    .msg-status-delivered {
      background: rgba(0, 188, 212, 0.2);
      color: #00bcd4;
    }

    .msg-status-read {
      background: rgba(76, 175, 80, 0.2);
      color: #4caf50;
    }

    .msg-status-replied {
      background: rgba(156, 39, 176, 0.2);
      color: #9c27b0;
    }

    .msg-status-error {
      background: rgba(244, 67, 54, 0.2);
      color: #f44336;
    }
  `],
})
export class WhatsappComponent implements OnInit {
  // Contacts
  contacts: Contact[] = [];
  loadingContacts = false;
  tagFilter = '';

  // Products
  products: Product[] = [];

  // Campaign creation
  newCampaign = {
    name: '',
    product_id: null as number | null,
    template_text: '',
    tag_filter: '',
  };
  creatingCampaign = false;
  selectedProduct: Product | null = null;

  // Campaigns list
  campaigns: WhatsAppCampaign[] = [];
  loadingCampaigns = false;
  sendingCampaignId: number | null = null;
  expandedCampaignId: number | null = null;

  @ViewChild('templateInput') templateInput!: ElementRef<HTMLTextAreaElement>;

  constructor(
    private whatsappService: WhatsAppService,
    private productService: ProductService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
  ) {}

  ngOnInit(): void {
    this.loadContacts();
    this.loadProducts();
    this.loadCampaigns();
  }

  // --- Contacts ---

  loadContacts(): void {
    this.loadingContacts = true;
    const tag = this.tagFilter.trim() || undefined;
    this.whatsappService.getContacts(tag).subscribe({
      next: (contacts) => {
        this.contacts = contacts;
        this.loadingContacts = false;
      },
      error: () => {
        this.contacts = [];
        this.loadingContacts = false;
      },
    });
  }

  openAddContactDialog(): void {
    const dialogRef = this.dialog.open(ContactDialogComponent, {
      width: '440px',
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.whatsappService.createContact(result).subscribe({
          next: () => {
            this.showMessage('Contato adicionado com sucesso');
            this.loadContacts();
          },
          error: (err) => {
            const msg = err?.error?.detail || 'Erro ao adicionar contato';
            this.showMessage(msg, true);
          },
        });
      }
    });
  }

  onCsvFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input?.files?.[0];
    if (!file) return;

    this.whatsappService.importContactsCsv(file).subscribe({
      next: (result) => {
        this.showMessage(
          `Importados: ${result.imported}, Duplicados ignorados: ${result.skipped}`
        );
        this.loadContacts();
      },
      error: () => {
        this.showMessage('Erro ao importar CSV', true);
      },
    });

    // Reset input so the same file can be selected again
    input.value = '';
  }

  deleteContact(contact: Contact): void {
    if (!confirm(`Excluir contato "${contact.name}"?`)) return;
    this.whatsappService.deleteContact(contact.id).subscribe({
      next: () => {
        this.contacts = this.contacts.filter((c) => c.id !== contact.id);
        this.showMessage('Contato removido');
      },
      error: () => this.showMessage('Erro ao remover contato', true),
    });
  }

  getTagArray(tags: string): string[] {
    if (!tags) return [];
    return tags
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
  }

  // --- Products ---

  loadProducts(): void {
    this.productService.getAll().subscribe({
      next: (products) => (this.products = products),
      error: () => (this.products = []),
    });
  }

  onProductSelected(): void {
    if (this.newCampaign.product_id) {
      this.selectedProduct =
        this.products.find((p) => p.id === this.newCampaign.product_id) || null;
    } else {
      this.selectedProduct = null;
    }
  }

  // --- Template ---

  insertVariable(variable: string): void {
    this.newCampaign.template_text += variable;
  }

  getPreviewText(): string {
    let text = this.newCampaign.template_text;
    text = text.replace(/\{nome\}/g, 'Maria Silva');
    text = text.replace(
      /\{produto\}/g,
      this.selectedProduct?.name || 'Produto Exemplo'
    );
    text = text.replace(
      /\{preco\}/g,
      this.selectedProduct
        ? `R$ ${this.selectedProduct.price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        : 'R$ 99,90'
    );
    return text;
  }

  // --- Campaign creation ---

  canCreateCampaign(): boolean {
    return !!(
      this.newCampaign.name.trim() && this.newCampaign.template_text.trim()
    );
  }

  createCampaign(): void {
    if (!this.canCreateCampaign()) return;
    this.creatingCampaign = true;

    this.whatsappService
      .createCampaign({
        name: this.newCampaign.name,
        product_id: this.newCampaign.product_id,
        template_text: this.newCampaign.template_text,
        contact_ids: null,
        tag_filter: this.newCampaign.tag_filter || null,
      })
      .subscribe({
        next: () => {
          this.creatingCampaign = false;
          this.showMessage('Campanha criada com sucesso!');
          this.loadCampaigns();
          // Reset form
          this.newCampaign = {
            name: '',
            product_id: null,
            template_text: '',
            tag_filter: '',
          };
          this.selectedProduct = null;
        },
        error: (err) => {
          this.creatingCampaign = false;
          const msg = err?.error?.detail || 'Erro ao criar campanha';
          this.showMessage(msg, true);
        },
      });
  }

  // --- Campaigns list ---

  loadCampaigns(): void {
    this.loadingCampaigns = true;
    this.whatsappService.getCampaigns().subscribe({
      next: (campaigns) => {
        this.campaigns = campaigns;
        this.loadingCampaigns = false;
      },
      error: () => {
        this.campaigns = [];
        this.loadingCampaigns = false;
      },
    });
  }

  sendCampaign(campaign: WhatsAppCampaign): void {
    this.sendingCampaignId = campaign.id;
    this.whatsappService.sendCampaign(campaign.id).subscribe({
      next: (result) => {
        this.sendingCampaignId = null;
        this.showMessage(
          `Envio concluido! Enviadas: ${result.sent}, Entregues: ${result.delivered}`
        );
        this.loadCampaigns();
      },
      error: (err) => {
        this.sendingCampaignId = null;
        const msg = err?.error?.detail || 'Erro ao enviar campanha';
        this.showMessage(msg, true);
      },
    });
  }

  pauseCampaign(campaign: WhatsAppCampaign): void {
    this.whatsappService.pauseCampaign(campaign.id).subscribe({
      next: () => {
        this.showMessage('Campanha pausada');
        this.loadCampaigns();
      },
      error: () => this.showMessage('Erro ao pausar campanha', true),
    });
  }

  viewDetails(campaign: WhatsAppCampaign): void {
    if (this.expandedCampaignId === campaign.id) {
      this.expandedCampaignId = null;
      return;
    }

    this.whatsappService.getCampaign(campaign.id).subscribe({
      next: (detail) => {
        const idx = this.campaigns.findIndex((c) => c.id === campaign.id);
        if (idx >= 0) {
          this.campaigns[idx] = detail;
        }
        this.expandedCampaignId = campaign.id;
      },
      error: () => this.showMessage('Erro ao carregar detalhes', true),
    });
  }

  getProgressPercent(campaign: WhatsAppCampaign): number {
    if (!campaign.total_contacts) return 0;
    return Math.round(
      (campaign.sent_count / campaign.total_contacts) * 100
    );
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      draft: 'Rascunho',
      sending: 'Enviando',
      completed: 'Concluida',
      paused: 'Pausada',
      error: 'Erro',
    };
    return labels[status] || status;
  }

  getMsgStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      pending: 'Pendente',
      sent: 'Enviada',
      delivered: 'Entregue',
      read: 'Lida',
      replied: 'Respondida',
      error: 'Erro',
    };
    return labels[status] || status;
  }

  private showMessage(message: string, isError = false): void {
    this.snackBar.open(message, 'OK', {
      duration: 3000,
      panelClass: isError ? ['snackbar-error'] : ['snackbar-success'],
    });
  }
}
