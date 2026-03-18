import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-contact-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
  ],
  template: `
    <h2 mat-dialog-title>Adicionar Contato</h2>
    <mat-dialog-content>
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Nome</mat-label>
        <input matInput [(ngModel)]="name" placeholder="Nome do contato" required>
      </mat-form-field>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Telefone</mat-label>
        <input matInput [(ngModel)]="phone" placeholder="5511999998888" required>
        <mat-hint>Formato: DDI + DDD + numero (ex: 5511999998888)</mat-hint>
      </mat-form-field>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Tags</mat-label>
        <input matInput [(ngModel)]="tags" placeholder="cliente, vip, lead">
        <mat-hint>Separe as tags por virgula</mat-hint>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancelar</button>
      <button mat-flat-button color="primary" [disabled]="!name || !phone" (click)="onSave()">
        <mat-icon>save</mat-icon> Salvar
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    mat-dialog-content {
      min-width: 360px;
      padding-top: 8px !important;
    }

    .full-width {
      width: 100%;
      margin-bottom: 8px;
    }

    ::ng-deep .mat-mdc-dialog-container {
      background: #16213e !important;
      color: #fff !important;
    }

    h2 {
      color: #fff;
    }

    mat-form-field {
      ::ng-deep .mat-mdc-text-field-wrapper {
        background: #0f1a30 !important;
      }

      ::ng-deep .mat-mdc-floating-label,
      ::ng-deep .mdc-text-field__input {
        color: #ccc !important;
      }

      ::ng-deep .mdc-notched-outline__leading,
      ::ng-deep .mdc-notched-outline__notch,
      ::ng-deep .mdc-notched-outline__trailing {
        border-color: #333 !important;
      }

      ::ng-deep .mat-mdc-form-field-hint {
        color: #888 !important;
      }
    }
  `],
})
export class ContactDialogComponent {
  name = '';
  phone = '';
  tags = '';

  constructor(private dialogRef: MatDialogRef<ContactDialogComponent>) {}

  onCancel(): void {
    this.dialogRef.close(null);
  }

  onSave(): void {
    if (!this.name || !this.phone) return;
    this.dialogRef.close({
      name: this.name.trim(),
      phone: this.phone.trim(),
      tags: this.tags.trim(),
    });
  }
}
