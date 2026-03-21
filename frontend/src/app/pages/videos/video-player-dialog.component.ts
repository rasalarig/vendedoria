import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface VideoPlayerDialogData {
  url: string;
  filename: string;
}

@Component({
  selector: 'app-video-player-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div class="player-wrapper">
      <div class="player-header">
        <h3 class="player-title">{{ data.filename }}</h3>
        <button mat-icon-button (click)="close()">
          <mat-icon>close</mat-icon>
        </button>
      </div>
      <video
        [src]="data.url"
        controls
        autoplay
        class="video-player"
      ></video>
    </div>
  `,
  styles: [`
    .player-wrapper {
      background: #09090b;
      border-radius: 12px;
      overflow: hidden;
    }

    .player-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      background: #18181b;
      border-bottom: 1px solid #27272a;
    }

    .player-title {
      font-size: 14px;
      font-weight: 600;
      color: #fafafa;
      margin: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      flex: 1;
      margin-right: 12px;
    }

    button mat-icon {
      color: #71717a;
    }

    .video-player {
      width: 100%;
      max-height: 70vh;
      display: block;
      background: #000;
    }
  `],
})
export class VideoPlayerDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<VideoPlayerDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: VideoPlayerDialogData,
  ) {}

  close(): void {
    this.dialogRef.close();
  }
}
