import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ReferenceVideo } from '../../services/video.service';

export interface VideoTagsDialogData {
  video: ReferenceVideo;
}

const AVAILABLE_TAGS = [
  { label: 'Engracado', color: '#eab308' },
  { label: 'Tutorial', color: '#3b82f6' },
  { label: 'Unboxing', color: '#f97316' },
  { label: 'Review', color: '#22c55e' },
  { label: 'Trend', color: '#ec4899' },
  { label: 'Lifestyle', color: '#8b5cf6' },
];

@Component({
  selector: 'app-video-tags-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <h2 mat-dialog-title class="title">
      <mat-icon class="title-icon">label</mat-icon>
      Tags do Video
    </h2>
    <mat-dialog-content>
      <p class="hint">Selecione as tags para este video:</p>
      <div class="tags-grid">
        @for (tag of availableTags; track tag.label) {
          <button
            class="tag-option"
            [class.selected]="isSelected(tag.label)"
            [style.--tag-color]="tag.color"
            (click)="toggleTag(tag.label)"
          >
            <mat-icon class="check-icon">{{ isSelected(tag.label) ? 'check_circle' : 'radio_button_unchecked' }}</mat-icon>
            <span class="tag-dot" [style.background]="tag.color"></span>
            {{ tag.label }}
          </button>
        }
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()" class="cancel-btn">Cancelar</button>
      <button mat-flat-button color="primary" (click)="onSave()" class="save-btn">
        <mat-icon>check</mat-icon>
        Salvar
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 18px;
      font-weight: 700;
      color: #fafafa;

      .title-icon {
        color: #8b5cf6;
      }
    }

    .hint {
      font-size: 14px;
      color: #71717a;
      margin: 0 0 16px;
    }

    .tags-grid {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .tag-option {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 14px;
      border: 1px solid #27272a;
      border-radius: 10px;
      background: #18181b;
      cursor: pointer;
      transition: all 0.15s ease;
      font-size: 14px;
      color: #a1a1aa;
      font-family: inherit;

      &:hover {
        border-color: #3f3f46;
        background: #1f1f23;
      }

      &.selected {
        border-color: var(--tag-color);
        background: rgba(139, 92, 246, 0.05);
        color: #fafafa;
      }

      .check-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
        color: #3f3f46;
      }

      &.selected .check-icon {
        color: var(--tag-color);
      }

      .tag-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        flex-shrink: 0;
      }
    }

    .cancel-btn {
      color: #71717a !important;
    }

    .save-btn {
      border-radius: 10px;
      padding: 6px 20px;
      font-weight: 600;

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
        margin-right: 4px;
      }
    }
  `],
})
export class VideoTagsDialogComponent {
  availableTags = AVAILABLE_TAGS;
  selectedTags: string[];

  constructor(
    public dialogRef: MatDialogRef<VideoTagsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: VideoTagsDialogData,
  ) {
    this.selectedTags = [...(data.video.tags || [])];
  }

  isSelected(tag: string): boolean {
    return this.selectedTags.includes(tag);
  }

  toggleTag(tag: string): void {
    if (this.isSelected(tag)) {
      this.selectedTags = this.selectedTags.filter(t => t !== tag);
    } else {
      this.selectedTags.push(tag);
    }
  }

  onCancel(): void {
    this.dialogRef.close(null);
  }

  onSave(): void {
    this.dialogRef.close(this.selectedTags);
  }
}
