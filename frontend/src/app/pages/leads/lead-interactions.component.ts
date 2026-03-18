import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Lead, LeadInteraction, LeadService } from '../../services/lead.service';

export interface InteractionDialogData {
  lead: Lead;
}

@Component({
  selector: 'app-lead-interactions',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
  ],
  template: `
    <h2 mat-dialog-title>Historico - {{ data.lead.name }}</h2>
    <mat-dialog-content>
      <div class="status-section">
        <mat-form-field appearance="outline" class="status-select">
          <mat-label>Status do Funil</mat-label>
          <mat-select [(ngModel)]="currentStatus" (selectionChange)="onStatusChange()">
            <mat-option value="novo">Novo</mat-option>
            <mat-option value="contatado">Contatado</mat-option>
            <mat-option value="interessado">Interessado</mat-option>
            <mat-option value="convertido">Convertido</mat-option>
            <mat-option value="perdido">Perdido</mat-option>
          </mat-select>
        </mat-form-field>
      </div>

      <div class="add-note-section">
        <mat-form-field appearance="outline" class="note-input">
          <mat-label>Adicionar Nota</mat-label>
          <input matInput [(ngModel)]="newNote" (keyup.enter)="addNote()">
        </mat-form-field>
        <button mat-flat-button color="primary" (click)="addNote()" [disabled]="!newNote.trim()">
          <mat-icon>add</mat-icon> Adicionar
        </button>
      </div>

      <div class="timeline">
        @for (interaction of interactions; track interaction.id) {
          <div class="timeline-item">
            <div class="timeline-dot" [class]="'dot-' + interaction.type"></div>
            <div class="timeline-content">
              <div class="timeline-icon">
                @switch (interaction.type) {
                  @case ('status_change') { <mat-icon>swap_horiz</mat-icon> }
                  @case ('note') { <mat-icon>note</mat-icon> }
                  @case ('whatsapp_sent') { <mat-icon>chat</mat-icon> }
                  @case ('whatsapp_replied') { <mat-icon>chat_bubble</mat-icon> }
                  @case ('meta_click') { <mat-icon>ads_click</mat-icon> }
                  @case ('email') { <mat-icon>email</mat-icon> }
                  @case ('call') { <mat-icon>phone</mat-icon> }
                  @default { <mat-icon>info</mat-icon> }
                }
              </div>
              <div class="timeline-text">
                <p class="timeline-desc">{{ interaction.description }}</p>
                <span class="timeline-date">{{ interaction.created_at | date:'dd/MM/yyyy HH:mm' }}</span>
              </div>
            </div>
          </div>
        }
        @if (interactions.length === 0) {
          <p class="no-interactions">Nenhuma interacao registrada.</p>
        }
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="dialogRef.close(statusChanged)">Fechar</button>
    </mat-dialog-actions>
  `,
  styles: [`
    mat-dialog-content {
      min-width: 450px;
      max-height: 500px;
    }

    .status-section {
      margin-bottom: 8px;
    }

    .status-select {
      width: 100%;
    }

    .add-note-section {
      display: flex;
      gap: 8px;
      align-items: flex-start;
      margin-bottom: 16px;

      .note-input {
        flex: 1;
      }

      button {
        margin-top: 4px;
        border-radius: 8px;
      }
    }

    .timeline {
      border-left: 2px solid #2a3f6e;
      margin-left: 12px;
      padding-left: 0;
    }

    .timeline-item {
      position: relative;
      padding: 0 0 16px 24px;

      .timeline-dot {
        position: absolute;
        left: -7px;
        top: 4px;
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: #2196F3;
      }

      .dot-status_change { background: #FF9800; }
      .dot-note { background: #9C27B0; }
      .dot-whatsapp_sent, .dot-whatsapp_replied { background: #4CAF50; }
      .dot-meta_click { background: #2196F3; }
      .dot-email { background: #00BCD4; }
      .dot-call { background: #FF5722; }
    }

    .timeline-content {
      display: flex;
      gap: 8px;
      align-items: flex-start;

      .timeline-icon mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
        color: #aaa;
      }
    }

    .timeline-text {
      .timeline-desc {
        margin: 0;
        font-size: 14px;
        color: #ddd;
      }

      .timeline-date {
        font-size: 11px;
        color: #888;
      }
    }

    .no-interactions {
      color: #888;
      text-align: center;
      padding: 20px;
    }
  `],
})
export class LeadInteractionsComponent implements OnInit {
  interactions: LeadInteraction[] = [];
  currentStatus: string;
  newNote = '';
  statusChanged = false;

  constructor(
    public dialogRef: MatDialogRef<LeadInteractionsComponent>,
    @Inject(MAT_DIALOG_DATA) public data: InteractionDialogData,
    private leadService: LeadService,
  ) {
    this.currentStatus = data.lead.funnel_status || 'novo';
  }

  ngOnInit(): void {
    this.loadInteractions();
  }

  loadInteractions(): void {
    this.leadService.getInteractions(this.data.lead.id).subscribe({
      next: (interactions) => this.interactions = interactions,
    });
  }

  onStatusChange(): void {
    if (this.currentStatus !== this.data.lead.funnel_status) {
      this.leadService.update(this.data.lead.id, { funnel_status: this.currentStatus }).subscribe({
        next: () => {
          this.data.lead.funnel_status = this.currentStatus;
          this.statusChanged = true;
          this.loadInteractions();
        },
      });
    }
  }

  addNote(): void {
    const note = this.newNote.trim();
    if (!note) return;
    this.leadService.addInteraction(this.data.lead.id, 'note', note).subscribe({
      next: () => {
        this.newNote = '';
        this.loadInteractions();
      },
    });
  }
}
