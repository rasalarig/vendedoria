import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { HttpEventType } from '@angular/common/http';
import { VideoService, ReferenceVideo } from '../../services/video.service';
import { VideoPlayerDialogComponent } from './video-player-dialog.component';
import { VideoTagsDialogComponent } from './video-tags-dialog.component';

@Component({
  selector: 'app-reference-videos',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatChipsModule,
    MatProgressBarModule,
    MatDialogModule,
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1>Videos de Referencia</h1>
          <p class="subtitle">Suba videos virais para inspirar seus criativos com IA</p>
        </div>
      </div>

      <!-- Upload Zone -->
      <div
        class="upload-zone"
        [class.drag-over]="isDragOver"
        [class.uploading]="isUploading"
        (dragover)="onDragOver($event)"
        (dragleave)="onDragLeave($event)"
        (drop)="onDrop($event)"
        (click)="fileInput.click()"
      >
        @if (isUploading) {
          <mat-icon class="upload-icon uploading-icon">cloud_sync</mat-icon>
          <p class="upload-text">Enviando {{ uploadFileName }}...</p>
          <div class="progress-wrapper">
            <mat-progress-bar mode="determinate" [value]="uploadProgress"></mat-progress-bar>
            <span class="progress-label">{{ uploadProgress }}%</span>
          </div>
        } @else {
          <mat-icon class="upload-icon">cloud_upload</mat-icon>
          <p class="upload-text">Arraste seus videos virais aqui</p>
          <p class="upload-hint">ou clique para selecionar</p>
          <p class="upload-formats">MP4, MOV, WebM (max 100MB)</p>
        }
        <input #fileInput type="file" accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm" (change)="onFileSelected($event)" style="display:none">
      </div>

      @if (videos.length === 0 && !loading) {
        <div class="empty-state">
          <div class="empty-icon-wrapper">
            <mat-icon class="empty-icon">videocam</mat-icon>
          </div>
          <h2>Suba videos virais de referencia</h2>
          <p class="empty-tip">Os videos de referencia ajudam a IA a criar criativos no estilo que voce gosta</p>
          <div class="tips-list">
            <div class="tip-item">
              <mat-icon>trending_up</mat-icon>
              <span>Videos que viralizaram no TikTok ou Reels</span>
            </div>
            <div class="tip-item">
              <mat-icon>style</mat-icon>
              <span>Estilos de edicao que voce gosta</span>
            </div>
            <div class="tip-item">
              <mat-icon>record_voice_over</mat-icon>
              <span>Referencias de tom de voz e narrativa</span>
            </div>
          </div>
        </div>
      }

      <!-- Video Grid -->
      @if (videos.length > 0) {
        <div class="video-grid">
          @for (video of videos; track video.id) {
            <div class="video-card">
              <div class="video-thumbnail" (click)="playVideo(video)">
                <div class="thumbnail-bg">
                  <mat-icon class="play-icon">play_circle_filled</mat-icon>
                </div>
                @if (video.duration) {
                  <div class="video-duration">
                    {{ formatDuration(video.duration) }}
                  </div>
                }
              </div>
              <div class="video-info">
                <div class="video-header">
                  <h3 class="video-name" [title]="video.original_filename">{{ truncateFilename(video.original_filename) }}</h3>
                  <button mat-icon-button class="video-delete" (click)="confirmDelete(video)" title="Excluir video">
                    <mat-icon>delete_outline</mat-icon>
                  </button>
                </div>
                <p class="video-size">{{ formatFileSize(video.file_size) }}</p>
                <div class="video-tags">
                  @if (video.tags && video.tags.length > 0) {
                    @for (tag of video.tags; track tag) {
                      <span class="tag-chip" [style.background]="getTagColor(tag)">{{ tag }}</span>
                    }
                  }
                  <button class="add-tag-btn" (click)="openTagsDialog(video)">
                    <mat-icon>add</mat-icon>
                  </button>
                </div>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
      padding: 32px;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 28px;

      h1 {
        font-size: 32px;
        font-weight: 800;
        color: #fafafa;
        margin: 0;
        letter-spacing: -1px;
      }

      .subtitle {
        color: #71717a;
        font-size: 14px;
        margin: 4px 0 0;
      }
    }

    /* Upload Zone */
    .upload-zone {
      width: 100%;
      padding: 40px 20px;
      border: 2px dashed #3f3f46;
      border-radius: 20px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s ease;
      background: #18181b;
      margin-bottom: 32px;

      &:hover {
        border-color: #8b5cf6;
        background: rgba(139, 92, 246, 0.04);
      }

      &.drag-over {
        border-color: #8b5cf6;
        background: rgba(139, 92, 246, 0.1);
        transform: scale(1.01);
        border-width: 3px;
      }

      &.uploading {
        cursor: default;
        border-color: #8b5cf6;
        border-style: solid;
      }
    }

    .upload-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: #52525b;
      margin-bottom: 12px;
    }

    .uploading-icon {
      color: #8b5cf6;
      animation: pulse 1.5s ease infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    .upload-text {
      font-size: 16px;
      color: #a1a1aa;
      margin: 0;
      font-weight: 500;
    }

    .upload-hint {
      font-size: 14px;
      color: #52525b;
      margin: 4px 0 0;
    }

    .upload-formats {
      font-size: 12px;
      color: #3f3f46;
      margin: 8px 0 0;
    }

    .progress-wrapper {
      width: 300px;
      max-width: 80%;
      margin-top: 16px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;

      mat-progress-bar {
        width: 100%;
        border-radius: 4px;
      }

      .progress-label {
        font-size: 13px;
        color: #8b5cf6;
        font-weight: 600;
      }
    }

    /* Empty State */
    .empty-state {
      text-align: center;
      padding: 60px 20px;

      .empty-icon-wrapper {
        width: 80px;
        height: 80px;
        margin: 0 auto 20px;
        border-radius: 50%;
        background: rgba(139, 92, 246, 0.1);
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .empty-icon {
        font-size: 40px;
        width: 40px;
        height: 40px;
        color: #8b5cf6;
      }

      h2 {
        font-size: 20px;
        font-weight: 700;
        color: #fafafa;
        margin: 0 0 8px;
      }

      .empty-tip {
        font-size: 14px;
        color: #71717a;
        margin: 0 0 28px;
        max-width: 420px;
        margin-left: auto;
        margin-right: auto;
        line-height: 1.5;
      }
    }

    .tips-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
      max-width: 360px;
      margin: 0 auto;
    }

    .tip-item {
      display: flex;
      align-items: center;
      gap: 10px;
      text-align: left;
      padding: 10px 16px;
      background: #18181b;
      border-radius: 10px;
      border: 1px solid #27272a;

      mat-icon {
        color: #8b5cf6;
        font-size: 20px;
        width: 20px;
        height: 20px;
        flex-shrink: 0;
      }

      span {
        font-size: 13px;
        color: #a1a1aa;
      }
    }

    /* Video Grid */
    .video-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
    }

    @media (max-width: 1024px) {
      .video-grid { grid-template-columns: repeat(2, 1fr); }
    }

    @media (max-width: 640px) {
      .video-grid { grid-template-columns: 1fr; }
    }

    .video-card {
      background: #18181b;
      border: 1px solid #27272a;
      border-radius: 14px;
      overflow: hidden;
      transition: transform 0.2s ease, box-shadow 0.2s ease;

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        border-color: #3f3f46;
      }
    }

    .video-thumbnail {
      width: 100%;
      height: 180px;
      background: linear-gradient(135deg, #09090b 0%, #1a1a2e 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      position: relative;
      overflow: hidden;

      .thumbnail-bg {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
        transition: background 0.2s ease;
      }

      &:hover .thumbnail-bg {
        background: rgba(139, 92, 246, 0.1);
      }

      &:hover .play-icon {
        transform: scale(1.15);
        color: #8b5cf6;
      }
    }

    .play-icon {
      font-size: 56px;
      width: 56px;
      height: 56px;
      color: #52525b;
      transition: all 0.2s ease;
    }

    .video-duration {
      position: absolute;
      bottom: 8px;
      right: 8px;
      background: rgba(0, 0, 0, 0.8);
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 12px;
      color: #fafafa;
      font-weight: 500;
    }

    .video-info {
      padding: 14px;
    }

    .video-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }

    .video-name {
      font-size: 14px;
      font-weight: 600;
      color: #fafafa;
      margin: 0;
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .video-delete {
      margin: -8px -8px 0 0;
      flex-shrink: 0;

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
        color: #52525b;
        transition: color 0.2s;
      }

      &:hover mat-icon {
        color: #ef4444;
      }
    }

    .video-size {
      font-size: 12px;
      color: #52525b;
      margin: 4px 0 10px;
    }

    .video-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      align-items: center;
    }

    .tag-chip {
      font-size: 11px;
      padding: 2px 10px;
      border-radius: 20px;
      color: #fafafa;
      font-weight: 500;
      letter-spacing: 0.2px;
    }

    .add-tag-btn {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      border: 1px dashed #3f3f46;
      background: transparent;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
      padding: 0;

      mat-icon {
        font-size: 14px;
        width: 14px;
        height: 14px;
        color: #52525b;
      }

      &:hover {
        border-color: #8b5cf6;
        background: rgba(139, 92, 246, 0.1);

        mat-icon {
          color: #8b5cf6;
        }
      }
    }
  `],
})
export class ReferenceVideosComponent implements OnInit {
  videos: ReferenceVideo[] = [];
  loading = true;
  isDragOver = false;
  isUploading = false;
  uploadProgress = 0;
  uploadFileName = '';

  private readonly TAG_COLORS: Record<string, string> = {
    'Engracado': '#eab308',
    'Tutorial': '#3b82f6',
    'Unboxing': '#f97316',
    'Review': '#22c55e',
    'Trend': '#ec4899',
    'Lifestyle': '#8b5cf6',
  };

  constructor(
    private videoService: VideoService,
    private dialog: MatDialog,
  ) {}

  ngOnInit(): void {
    this.loadVideos();
  }

  loadVideos(): void {
    this.loading = true;
    this.videoService.getVideos().subscribe({
      next: (videos) => {
        this.videos = videos;
        this.loading = false;
      },
      error: () => {
        this.videos = [];
        this.loading = false;
      },
    });
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.uploadFile(files[0]);
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.uploadFile(input.files[0]);
      input.value = '';
    }
  }

  private uploadFile(file: File): void {
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      alert('Arquivo muito grande. O tamanho maximo e 100MB.');
      return;
    }

    const validTypes = ['video/mp4', 'video/quicktime', 'video/webm'];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(mp4|mov|webm)$/i)) {
      alert('Formato invalido. Use MP4, MOV ou WebM.');
      return;
    }

    this.isUploading = true;
    this.uploadProgress = 0;
    this.uploadFileName = file.name;

    this.videoService.uploadVideo(file).subscribe({
      next: (event) => {
        if (event.type === HttpEventType.UploadProgress && event.total) {
          this.uploadProgress = Math.round((event.loaded / event.total) * 100);
        } else if (event.type === HttpEventType.Response) {
          this.isUploading = false;
          this.uploadProgress = 0;
          this.loadVideos();
        }
      },
      error: () => {
        this.isUploading = false;
        this.uploadProgress = 0;
        alert('Erro ao enviar video. Tente novamente.');
      },
    });
  }

  playVideo(video: ReferenceVideo): void {
    this.dialog.open(VideoPlayerDialogComponent, {
      data: {
        url: this.videoService.getStreamUrl(video.id),
        filename: video.original_filename,
      },
      width: '80vw',
      maxWidth: '900px',
      panelClass: 'video-player-dialog',
    });
  }

  confirmDelete(video: ReferenceVideo): void {
    const confirmed = window.confirm(`Tem certeza que deseja excluir "${video.original_filename}"?`);
    if (confirmed) {
      this.videoService.deleteVideo(video.id).subscribe({
        next: () => this.loadVideos(),
      });
    }
  }

  openTagsDialog(video: ReferenceVideo): void {
    const dialogRef = this.dialog.open(VideoTagsDialogComponent, {
      data: { video },
      width: '400px',
      panelClass: 'dark-dialog',
    });

    dialogRef.afterClosed().subscribe((tags: string[] | null) => {
      if (tags !== null && tags !== undefined) {
        // Update video tags locally (backend would persist via a PATCH if available)
        video.tags = tags;
      }
    });
  }

  formatFileSize(bytes: number): string {
    if (!bytes) return '';
    if (bytes < 1024 * 1024) {
      return (bytes / 1024).toFixed(0) + ' KB';
    }
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  truncateFilename(name: string): string {
    if (!name) return '';
    return name.length > 28 ? name.substring(0, 25) + '...' : name;
  }

  getTagColor(tag: string): string {
    return this.TAG_COLORS[tag] || '#6b7280';
  }
}
