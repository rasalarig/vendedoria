import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { HttpClient } from '@angular/common/http';
import { ProductService, Product } from '../../services/product.service';
import { I18nService } from '../../services/i18n.service';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="product-detail-page">
      <!-- Header -->
      <div class="page-header">
        <button mat-icon-button (click)="goBack()" class="back-btn" [title]="i18n.t('common.back')">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <div>
          <h1>{{ isEditing ? i18n.t('products.editProduct') : i18n.t('products.newProduct') }}</h1>
          <p class="subtitle">{{ isEditing ? i18n.t('products.editSubtitle') : i18n.t('products.newSubtitle') }}</p>
        </div>
      </div>

      <!-- Product Form -->
      <div class="form-section">
        <form [formGroup]="form" class="product-form">
          <!-- Photo Upload Zone -->
          <div
            class="photo-zone"
            [class.has-preview]="imagePreview"
            [class.drag-over]="isDragOver"
            (dragover)="onDragOver($event)"
            (dragleave)="onDragLeave($event)"
            (drop)="onDrop($event)"
            (click)="fileInput.click()"
          >
            @if (imagePreview) {
              <img [src]="imagePreview" alt="Preview" class="photo-preview">
              <div class="photo-overlay">
                <mat-icon>photo_camera</mat-icon>
                <span>{{ i18n.t('products.changePhoto') }}</span>
              </div>
            } @else {
              <mat-icon class="upload-icon">add_photo_alternate</mat-icon>
              <p class="upload-text">{{ i18n.t('products.dragPhoto') }}</p>
              <p class="upload-hint">{{ i18n.t('products.photoFormats') }}</p>
            }
            <input #fileInput type="file" accept="image/*" (change)="onFileSelected($event)" style="display:none">
          </div>

          <div class="form-grid">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>{{ i18n.t('products.name') }}</mat-label>
              <input matInput formControlName="name" [placeholder]="i18n.t('products.namePlaceholder')">
              @if (form.get('name')?.hasError('required') && form.get('name')?.touched) {
                <mat-error>{{ i18n.t('products.nameRequired') }}</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>{{ i18n.t('products.priceLabel') }}</mat-label>
              <input matInput type="number" formControlName="price" placeholder="0.00" step="0.01">
              @if (form.get('price')?.hasError('required') && form.get('price')?.touched) {
                <mat-error>{{ i18n.t('products.priceRequired') }}</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>{{ i18n.t('products.type') }}</mat-label>
              <mat-select formControlName="product_type">
                <mat-option value="produto">
                  <mat-icon>inventory_2</mat-icon> {{ i18n.t('products.product') }}
                </mat-option>
                <mat-option value="servico">
                  <mat-icon>design_services</mat-icon> {{ i18n.t('products.service') }}
                </mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>{{ i18n.t('products.paymentType') }}</mat-label>
              <mat-select formControlName="pricing_type">
                <mat-option value="one_time">
                  <mat-icon>payments</mat-icon> {{ i18n.t('products.oneTime') }}
                </mat-option>
                <mat-option value="monthly">
                  <mat-icon>autorenew</mat-icon> {{ i18n.t('products.monthly') }}
                </mat-option>
              </mat-select>
            </mat-form-field>
          </div>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>{{ i18n.t('products.description') }}</mat-label>
            <textarea matInput formControlName="description" rows="3" [placeholder]="i18n.t('products.descriptionPlaceholder')" maxlength="300"></textarea>
            <mat-hint align="end">{{ form.get('description')?.value?.length || 0 }}/300</mat-hint>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>{{ i18n.t('products.websiteUrl') }}</mat-label>
            <mat-icon matPrefix class="url-prefix-icon">link</mat-icon>
            <input matInput formControlName="website_url" [placeholder]="i18n.t('products.websitePlaceholder')">
          </mat-form-field>

          <div class="form-actions">
            <button mat-button (click)="goBack()" class="cancel-btn">{{ i18n.t('common.cancel') }}</button>
            <button mat-flat-button color="primary" (click)="onSave()" [disabled]="form.invalid || saving" class="save-btn">
              @if (saving) {
                <mat-spinner diameter="20"></mat-spinner>
              } @else {
                <mat-icon>check</mat-icon>
              }
              {{ i18n.t('common.save') }}
            </button>
          </div>
        </form>
      </div>

      <!-- Video Gallery (only when editing) -->
      @if (isEditing && productId) {
        <div class="video-section">
          <div class="video-header">
            <div class="video-title-row">
              <h2>{{ i18n.t('products.videos') }}</h2>
              <span class="video-count-badge">{{ videos.length }}</span>
            </div>
            <button mat-flat-button color="primary" (click)="videoFileInput.click()" [disabled]="uploadingVideo" class="upload-video-btn">
              @if (uploadingVideo) {
                <mat-spinner diameter="18"></mat-spinner>
              } @else {
                <mat-icon>upload</mat-icon>
              }
              {{ i18n.t('products.uploadVideo') }}
            </button>
            <input #videoFileInput type="file" accept="video/*" (change)="onVideoFileSelected($event)" style="display:none">
          </div>

          @if (loadingVideos) {
            <div class="loading-videos">
              <mat-spinner diameter="32"></mat-spinner>
              <span>{{ i18n.t('products.loadingVideos') }}</span>
            </div>
          } @else if (videos.length === 0) {
            <div class="empty-videos">
              <mat-icon class="empty-video-icon">videocam_off</mat-icon>
              <p>{{ i18n.t('products.noVideos') }}</p>
              <p class="empty-video-hint">{{ i18n.t('products.noVideosHint') }}</p>
            </div>
          } @else {
            <div class="video-grid">
              @for (video of videos; track video.id) {
                <div class="video-card">
                  <div class="video-thumbnail" (click)="togglePlay(video)">
                    <video
                      [id]="'video-' + video.id"
                      [src]="getVideoUrl(video)"
                      preload="metadata"
                      [muted]="true"
                      playsinline
                      class="video-element"
                    ></video>
                    @if (!video._playing) {
                      <div class="play-overlay">
                        <mat-icon class="play-icon">play_circle_filled</mat-icon>
                      </div>
                    }
                    <button class="video-delete-btn" mat-icon-button (click)="confirmDeleteVideo($event, video)" [title]="i18n.t('products.deleteVideo')">
                      <mat-icon>delete</mat-icon>
                    </button>
                    @if (video.provider) {
                      <span class="provider-badge">{{ getProviderLabel(video.provider) }}</span>
                    }
                  </div>
                  <div class="video-info">
                    <div class="video-meta">
                      @if (video.duration) {
                        <span class="video-duration">{{ formatDuration(video.duration) }}</span>
                      }
                      @if (video.created_at) {
                        <span class="video-date">{{ formatDate(video.created_at) }}</span>
                      }
                    </div>
                    @if (video.script) {
                      <p class="video-script">{{ video.script | slice:0:80 }}{{ video.script.length > 80 ? '...' : '' }}</p>
                    }
                  </div>
                </div>
              }
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
      max-width: 900px;
      margin: 0 auto;
    }

    .page-header {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 32px;

      h1 {
        font-size: 28px;
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

    .back-btn {
      color: #a1a1aa;
      background: #18181b;
      border: 1px solid #27272a;

      &:hover {
        background: #27272a;
        color: #fafafa;
      }
    }

    .form-section {
      background: #18181b;
      border: 1px solid #27272a;
      border-radius: 16px;
      padding: 28px;
      margin-bottom: 32px;
    }

    .product-form {
      display: flex;
      flex-direction: column;
    }

    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0 20px;
    }

    .full-width {
      width: 100%;
    }

    .url-prefix-icon {
      color: #71717a;
      margin-right: 4px;
    }

    .photo-zone {
      width: 100%;
      height: 180px;
      border: 2px dashed #3f3f46;
      border-radius: 14px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s ease;
      margin-bottom: 24px;
      position: relative;
      overflow: hidden;
      background: #09090b;

      &:hover {
        border-color: #8b5cf6;
        background: rgba(139, 92, 246, 0.05);
      }

      &.drag-over {
        border-color: #8b5cf6;
        background: rgba(139, 92, 246, 0.1);
        transform: scale(1.01);
      }

      &.has-preview {
        border-style: solid;
        border-color: #27272a;
      }

      &.has-preview:hover .photo-overlay {
        opacity: 1;
      }
    }

    .upload-icon {
      font-size: 36px;
      width: 36px;
      height: 36px;
      color: #52525b;
      margin-bottom: 8px;
    }

    .upload-text {
      font-size: 14px;
      color: #71717a;
      margin: 0;
    }

    .upload-hint {
      font-size: 12px;
      color: #52525b;
      margin: 4px 0 0;
    }

    .photo-preview {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .photo-overlay {
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.6);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity 0.2s ease;
      color: white;
      gap: 4px;

      mat-icon {
        font-size: 28px;
        width: 28px;
        height: 28px;
      }

      span {
        font-size: 13px;
      }
    }

    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 8px;
    }

    .cancel-btn {
      color: #71717a !important;
      min-height: 44px;
    }

    .save-btn {
      border-radius: 10px;
      padding: 6px 24px;
      font-weight: 600;
      min-height: 44px;
      display: flex;
      align-items: center;
      gap: 6px;

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }
    }

    /* Video Section */
    .video-section {
      background: #18181b;
      border: 1px solid #27272a;
      border-radius: 16px;
      padding: 28px;
    }

    .video-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 24px;
    }

    .video-title-row {
      display: flex;
      align-items: center;
      gap: 10px;

      h2 {
        font-size: 20px;
        font-weight: 700;
        color: #fafafa;
        margin: 0;
      }
    }

    .video-count-badge {
      background: #8b5cf6;
      color: white;
      font-size: 12px;
      font-weight: 700;
      padding: 2px 10px;
      border-radius: 20px;
      min-width: 24px;
      text-align: center;
    }

    .upload-video-btn {
      border-radius: 10px;
      padding: 8px 20px;
      font-weight: 600;
      min-height: 44px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .loading-videos {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      padding: 48px 0;
      color: #71717a;
      font-size: 14px;
    }

    .empty-videos {
      text-align: center;
      padding: 48px 20px;
      border: 2px dashed #27272a;
      border-radius: 14px;
      background: #09090b;

      .empty-video-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        color: #3f3f46;
        margin-bottom: 12px;
      }

      p {
        color: #71717a;
        font-size: 14px;
        margin: 0 0 4px;
      }

      .empty-video-hint {
        font-size: 13px;
        color: #52525b;
      }
    }

    .video-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
    }

    .video-card {
      background: #09090b;
      border: 1px solid #27272a;
      border-radius: 12px;
      overflow: hidden;
      transition: border-color 0.2s ease, box-shadow 0.2s ease;

      &:hover {
        border-color: #3f3f46;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);

        .video-delete-btn {
          opacity: 1;
        }
      }
    }

    .video-thumbnail {
      position: relative;
      width: 100%;
      aspect-ratio: 16/9;
      background: #000;
      cursor: pointer;
      overflow: hidden;
    }

    .video-element {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .play-overlay {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0, 0, 0, 0.35);
      transition: background 0.2s ease;

      &:hover {
        background: rgba(0, 0, 0, 0.2);
      }
    }

    .play-icon {
      font-size: 52px;
      width: 52px;
      height: 52px;
      color: rgba(255, 255, 255, 0.9);
      filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.5));
    }

    .video-delete-btn {
      position: absolute;
      top: 8px;
      right: 8px;
      opacity: 0;
      transition: opacity 0.2s ease;
      background: rgba(220, 38, 38, 0.85) !important;
      backdrop-filter: blur(8px);
      width: 36px;
      height: 36px;

      mat-icon {
        color: white;
        font-size: 18px;
        width: 18px;
        height: 18px;
      }
    }

    .provider-badge {
      position: absolute;
      bottom: 8px;
      left: 8px;
      background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(8px);
      color: #e4e4e7;
      font-size: 11px;
      font-weight: 600;
      padding: 3px 10px;
      border-radius: 6px;
      text-transform: capitalize;
    }

    .video-info {
      padding: 12px;
    }

    .video-meta {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 6px;
    }

    .video-duration {
      font-size: 13px;
      font-weight: 600;
      color: #a1a1aa;
    }

    .video-date {
      font-size: 12px;
      color: #52525b;
    }

    .video-script {
      font-size: 12px;
      color: #71717a;
      margin: 0;
      line-height: 1.4;
    }

    /* Responsive */
    @media (max-width: 768px) {
      :host {
        padding: 20px 16px;
      }

      .page-header h1 {
        font-size: 22px;
      }

      .form-section,
      .video-section {
        padding: 20px;
      }

      .form-grid {
        grid-template-columns: 1fr;
        gap: 0;
      }

      .video-grid {
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
      }

      .video-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 12px;
      }

      .upload-video-btn {
        width: 100%;
        justify-content: center;
      }

      .form-actions {
        flex-direction: column-reverse;

        button {
          width: 100%;
          justify-content: center;
        }
      }
    }

    @media (max-width: 480px) {
      :host {
        padding: 16px 12px;
      }

      .page-header h1 {
        font-size: 20px;
      }

      .form-section,
      .video-section {
        padding: 16px;
        border-radius: 12px;
      }

      .photo-zone {
        height: 140px;
      }

      .video-grid {
        grid-template-columns: 1fr;
      }

      .video-delete-btn {
        opacity: 1;
      }
    }
  `],
})
export class ProductDetailComponent implements OnInit {
  form!: FormGroup;
  selectedFile: File | null = null;
  imagePreview: string | null = null;
  isDragOver = false;
  saving = false;

  isEditing = false;
  productId: number | null = null;
  product: Product | null = null;

  videos: any[] = [];
  loadingVideos = false;
  uploadingVideo = false;

  private apiBase = window.location.hostname === 'localhost' ? 'http://localhost:8001' : '';

  constructor(
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute,
    private router: Router,
    private productService: ProductService,
    private http: HttpClient,
    public i18n: I18nService,
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      name: ['', Validators.required],
      price: [null, Validators.required],
      product_type: ['produto'],
      pricing_type: ['one_time'],
      description: [''],
      website_url: [''],
    });

    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.productId = +idParam;
      this.isEditing = true;
      this.loadProduct();
      this.loadVideos();
    }
  }

  loadProduct(): void {
    if (!this.productId) return;
    this.productService.getById(this.productId).subscribe({
      next: (product) => {
        this.product = product;
        this.form.patchValue({
          name: product.name,
          price: product.price,
          product_type: product.product_type || 'produto',
          pricing_type: product.pricing_type || 'one_time',
          description: product.description || '',
          website_url: product.website_url || '',
        });
        if (product.image_path) {
          this.imagePreview = `${this.apiBase}${product.image_path}`;
        }
      },
      error: () => {
        this.router.navigate(['/products']);
      },
    });
  }

  loadVideos(): void {
    if (!this.productId) return;
    this.loadingVideos = true;
    const url = `${this.apiBase}/api/creatives/generated-videos?product_id=${this.productId}`;
    this.http.get<any[]>(url).subscribe({
      next: (videos) => {
        this.videos = videos.map(v => ({ ...v, _playing: false }));
        this.loadingVideos = false;
      },
      error: () => {
        this.videos = [];
        this.loadingVideos = false;
      },
    });
  }

  goBack(): void {
    this.router.navigate(['/products']);
  }

  // Image drag & drop
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
    if (files && files.length > 0 && files[0].type.startsWith('image/')) {
      this.setFile(files[0]);
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.setFile(input.files[0]);
    }
  }

  private setFile(file: File): void {
    this.selectedFile = file;
    const reader = new FileReader();
    reader.onload = () => {
      this.imagePreview = reader.result as string;
      this.cdr.detectChanges();
    };
    reader.readAsDataURL(file);
  }

  onSave(): void {
    if (this.form.invalid || this.saving) return;
    this.saving = true;

    const formData = new FormData();
    const values = this.form.value;
    formData.append('name', values.name);
    formData.append('price', values.price.toString());
    if (values.description) formData.append('description', values.description);
    if (values.website_url) formData.append('website_url', values.website_url);
    formData.append('product_type', values.product_type || 'produto');
    formData.append('pricing_type', values.pricing_type || 'one_time');
    if (this.selectedFile) {
      formData.append('image', this.selectedFile);
    }

    const request$ = this.isEditing && this.productId
      ? this.productService.update(this.productId, formData)
      : this.productService.create(formData);

    request$.subscribe({
      next: (product) => {
        this.saving = false;
        if (!this.isEditing) {
          // Navigate to edit page of the newly created product
          this.router.navigate(['/products', product.id]);
        } else {
          this.loadProduct();
        }
      },
      error: () => {
        this.saving = false;
      },
    });
  }

  // Video methods
  getVideoUrl(video: any): string {
    if (video.filename?.startsWith('custom_')) {
      return `${this.apiBase}/uploads/videos/custom/${video.filename}`;
    }
    return `${this.apiBase}/uploads/videos/generated/${video.filename}`;
  }

  getProviderLabel(provider: string): string {
    const labels: Record<string, string> = {
      veo3: 'Veo 3',
      custom: 'Upload',
      mock: 'Demo',
    };
    return labels[provider] || provider;
  }

  formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  formatDate(dateStr: string): string {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
    } catch {
      return '';
    }
  }

  togglePlay(video: any): void {
    const el = document.getElementById('video-' + video.id) as HTMLVideoElement;
    if (!el) return;

    if (video._playing) {
      el.pause();
      video._playing = false;
    } else {
      // Pause all other videos
      this.videos.forEach(v => {
        if (v.id !== video.id && v._playing) {
          const other = document.getElementById('video-' + v.id) as HTMLVideoElement;
          if (other) other.pause();
          v._playing = false;
        }
      });
      el.muted = false;
      el.play();
      video._playing = true;
      el.onended = () => {
        video._playing = false;
        this.cdr.detectChanges();
      };
    }
  }

  confirmDeleteVideo(event: MouseEvent, video: any): void {
    event.stopPropagation();
    const confirmed = window.confirm(this.i18n.t('products.confirmDeleteVideo'));
    if (!confirmed) return;

    const url = `${this.apiBase}/api/creatives/generated-videos/${video.id}`;
    this.http.delete(url).subscribe({
      next: () => {
        this.videos = this.videos.filter(v => v.id !== video.id);
      },
    });
  }

  onVideoFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0 || !this.productId) return;

    const file = input.files[0];
    this.uploadingVideo = true;

    const formData = new FormData();
    formData.append('file', file);

    const url = `${this.apiBase}/api/creatives/upload-video?product_id=${this.productId}`;
    this.http.post<any>(url, formData).subscribe({
      next: (video) => {
        this.videos.unshift({ ...video, _playing: false });
        this.uploadingVideo = false;
        input.value = '';
      },
      error: () => {
        this.uploadingVideo = false;
        input.value = '';
      },
    });
  }
}
