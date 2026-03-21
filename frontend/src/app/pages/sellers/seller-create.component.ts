import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { SellerService, SellerFace, SellerVoice } from '../../services/seller.service';

interface PersonalityOption {
  key: string;
  label: string;
  icon: string;
  desc: string;
}

@Component({
  selector: 'app-seller-create',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  template: `
    <div class="create-page">
      <div class="page-top">
        <button mat-button class="back-btn" (click)="goBack()">
          <mat-icon>arrow_back</mat-icon>
          Voltar
        </button>
        <h1>Criar Vendedor</h1>
        <p class="subtitle">Configure um novo vendedor virtual em poucos passos</p>
      </div>

      <div class="two-column">
        <!-- Left: Steps -->
        <div class="steps-column">

          <!-- Step 1: Face -->
          <section class="step-section">
            <div class="step-label"><span class="step-num">1</span> Quem sera seu vendedor?</div>
            <p class="step-hint">Escolha o rosto</p>
            <div class="faces-grid">
              @for (face of faces; track face.id) {
                @if (!face.is_custom) {
                  <div
                    class="face-card"
                    [class.selected]="selectedFace?.id === face.id"
                    (click)="selectFace(face)"
                  >
                    <div class="face-img-wrap">
                      <img [src]="face.thumbnail_url" [alt]="face.name">
                      @if (selectedFace?.id === face.id) {
                        <div class="check-overlay">
                          <mat-icon>check_circle</mat-icon>
                        </div>
                      }
                    </div>
                    <span class="face-name">{{ face.name }}</span>
                  </div>
                }
              }

              <!-- Upload card -->
              @if (!uploadedFaceUrl) {
                <div
                  class="face-card upload-card"
                  [class.selected]="selectedFace?.id?.startsWith('custom')"
                  (click)="triggerUpload()"
                >
                  <div class="face-img-wrap upload-placeholder">
                    @if (uploading) {
                      <mat-icon class="spin">hourglass_empty</mat-icon>
                    } @else {
                      <mat-icon class="upload-icon">add_a_photo</mat-icon>
                    }
                  </div>
                  <span class="face-name">{{ uploading ? 'Enviando...' : 'Enviar sua foto' }}</span>
                </div>
              } @else {
                <div
                  class="face-card"
                  [class.selected]="selectedFace?.id?.startsWith('custom')"
                  (click)="selectCustomFace()"
                >
                  <div class="face-img-wrap">
                    <img [src]="uploadedFaceUrl" alt="Foto personalizada">
                    @if (selectedFace?.id?.startsWith('custom')) {
                      <div class="check-overlay">
                        <mat-icon>check_circle</mat-icon>
                      </div>
                    }
                  </div>
                  <span class="face-name">Personalizado</span>
                  <button class="change-photo-btn" (click)="triggerUpload(); $event.stopPropagation()">Trocar</button>
                </div>
              }
            </div>
            <input
              #fileInput
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              style="display: none"
              (change)="onFileSelected($event)"
            >
          </section>

          <!-- Step 2: Voice -->
          <section class="step-section">
            <div class="step-label"><span class="step-num">2</span> Como ele vai falar?</div>
            <p class="step-hint">Escolha a voz</p>
            <div class="voices-list">
              @for (voice of voices; track voice.id) {
                <div
                  class="voice-card"
                  [class.selected]="selectedVoice?.id === voice.id"
                  (click)="selectVoice(voice)"
                >
                  <div class="voice-icon">
                    <mat-icon>{{ voice.gender === 'female' ? 'woman' : 'man' }}</mat-icon>
                  </div>
                  <div class="voice-info">
                    <span class="voice-name">{{ voice.name }}</span>
                    <span class="voice-tone">{{ voice.tone }}</span>
                  </div>
                  <button class="play-btn" disabled title="Preview indisponivel">
                    <mat-icon>play_circle_outline</mat-icon>
                  </button>
                </div>
              }
            </div>
          </section>

          <!-- Step 3: Personality -->
          <section class="step-section">
            <div class="step-label"><span class="step-num">3</span> Qual o estilo?</div>
            <p class="step-hint">Personalidade do vendedor</p>
            <div class="personality-grid">
              @for (p of personalities; track p.key) {
                <div
                  class="personality-card"
                  [class.selected]="selectedPersonality === p.key"
                  (click)="selectPersonality(p.key)"
                >
                  <mat-icon class="pers-icon">{{ p.icon }}</mat-icon>
                  <div class="pers-text">
                    <span class="pers-label">{{ p.label }}</span>
                    <span class="pers-desc">{{ p.desc }}</span>
                  </div>
                </div>
              }
            </div>
          </section>

          <!-- Step 4: Name & Details -->
          <section class="step-section">
            <div class="step-label"><span class="step-num">4</span> Nome e Detalhes</div>
            <p class="step-hint">Identidade do vendedor</p>
            <div class="form-fields">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Nome do vendedor</mat-label>
                <input matInput [(ngModel)]="sellerName" maxlength="60">
              </mat-form-field>
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Bordoes / frases de efeito</mat-label>
                <textarea matInput [(ngModel)]="catchphrases" rows="3"
                  placeholder="Ex: 'Corre que e por tempo limitado!'"></textarea>
                <mat-hint>Opcional</mat-hint>
              </mat-form-field>
            </div>
          </section>

          <!-- Create Button -->
          <div class="create-action">
            <button
              mat-flat-button
              color="primary"
              class="create-btn"
              [disabled]="!canCreate() || creating"
              (click)="create()"
            >
              @if (creating) {
                <mat-icon class="spin">hourglass_empty</mat-icon>
                Criando...
              } @else {
                <mat-icon>check</mat-icon>
                Criar Vendedor
              }
            </button>
          </div>
        </div>

        <!-- Right: Live Preview -->
        <div class="preview-column">
          <div class="preview-sticky">
            <div class="preview-label">Preview</div>
            <div class="preview-card">
              @if (selectedFace) {
                <div class="preview-avatar">
                  <img [src]="getPreviewImageUrl()" [alt]="selectedFace.name">
                </div>
                <h3 class="preview-name">{{ sellerName || selectedFace.name }}</h3>
                @if (selectedPersonality) {
                  <span class="preview-badge">{{ getPersonalityLabel(selectedPersonality) }}</span>
                }
                @if (selectedVoice) {
                  <p class="preview-voice">
                    <mat-icon class="inline-icon">record_voice_over</mat-icon>
                    {{ selectedVoice.name }}
                  </p>
                }
                @if (catchphrases) {
                  <p class="preview-catchphrase">"{{ catchphrases }}"</p>
                }
              } @else {
                <div class="preview-placeholder">
                  <mat-icon>face_retouching_natural</mat-icon>
                  <p>Selecione um rosto para comecar</p>
                </div>
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      padding: 32px;
    }

    .page-top {
      margin-bottom: 32px;

      .back-btn {
        color: #71717a;
        margin-bottom: 8px;
        mat-icon { font-size: 20px; width: 20px; height: 20px; margin-right: 4px; }
      }

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

    .two-column {
      display: flex;
      gap: 32px;
      align-items: flex-start;
    }

    .steps-column {
      flex: 6;
      min-width: 0;
    }

    .preview-column {
      flex: 4;
      min-width: 0;
    }

    .preview-sticky {
      position: sticky;
      top: 32px;
    }

    /* Steps */
    .step-section {
      margin-bottom: 40px;
    }

    .step-label {
      font-size: 18px;
      font-weight: 700;
      color: #fafafa;
      margin-bottom: 4px;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .step-num {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: #8b5cf6;
      color: white;
      font-size: 14px;
      font-weight: 700;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .step-hint {
      color: #71717a;
      font-size: 13px;
      margin: 2px 0 16px;
      padding-left: 38px;
    }

    /* Faces Grid */
    .faces-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
    }

    .face-card {
      background: #18181b;
      border: 2px solid #27272a;
      border-radius: 16px;
      padding: 16px;
      text-align: center;
      cursor: pointer;
      transition: border-color 0.2s ease, transform 0.15s ease, box-shadow 0.2s ease;

      &:hover {
        border-color: #3f3f46;
        transform: translateY(-2px);
      }

      &.selected {
        border-color: #8b5cf6;
        border-width: 3px;
        box-shadow: 0 0 20px rgba(139, 92, 246, 0.25);
      }
    }

    .face-img-wrap {
      position: relative;
      width: 140px;
      height: 140px;
      margin: 0 auto 12px;
      border-radius: 16px;
      overflow: hidden;
      background: #09090b;

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .check-overlay {
        position: absolute;
        inset: 0;
        background: rgba(139, 92, 246, 0.45);
        display: flex;
        align-items: center;
        justify-content: center;

        mat-icon {
          font-size: 40px;
          width: 40px;
          height: 40px;
          color: white;
        }
      }
    }

    .face-name {
      font-size: 14px;
      color: #a1a1aa;
      font-weight: 600;
      display: block;
    }

    /* Upload card */
    .upload-card {
      border-style: dashed;
      border-color: #27272a;

      &:hover {
        border-color: #8b5cf6;
        border-style: dashed;
      }
    }

    .upload-placeholder {
      display: flex;
      align-items: center;
      justify-content: center;
      background: #09090b;
      border: none;
    }

    .upload-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: #3f3f46;
      transition: color 0.2s ease;
    }

    .upload-card:hover .upload-icon {
      color: #8b5cf6;
    }

    .change-photo-btn {
      display: inline-block;
      margin-top: 6px;
      background: rgba(139, 92, 246, 0.15);
      color: #a78bfa;
      border: 1px solid rgba(139, 92, 246, 0.3);
      border-radius: 8px;
      padding: 3px 14px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s ease;

      &:hover {
        background: rgba(139, 92, 246, 0.3);
      }
    }

    /* Voices */
    .voices-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .voice-card {
      display: flex;
      align-items: center;
      gap: 14px;
      background: #18181b;
      border: 2px solid #27272a;
      border-radius: 12px;
      padding: 14px 16px;
      cursor: pointer;
      transition: border-color 0.2s ease;

      &:hover {
        border-color: #3f3f46;
      }

      &.selected {
        border-color: #8b5cf6;
        box-shadow: 0 0 12px rgba(139, 92, 246, 0.15);
      }
    }

    .voice-icon {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: #27272a;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;

      mat-icon {
        font-size: 22px;
        width: 22px;
        height: 22px;
        color: #a78bfa;
      }
    }

    .voice-info {
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    .voice-name {
      font-size: 15px;
      font-weight: 600;
      color: #fafafa;
    }

    .voice-tone {
      font-size: 12px;
      color: #8b5cf6;
      font-weight: 500;
    }

    .play-btn {
      background: none;
      border: none;
      cursor: not-allowed;
      opacity: 0.3;
      padding: 4px;

      mat-icon {
        font-size: 28px;
        width: 28px;
        height: 28px;
        color: #71717a;
      }
    }

    /* Personality */
    .personality-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
    }

    .personality-card {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      background: #18181b;
      border: 2px solid #27272a;
      border-radius: 12px;
      padding: 16px;
      cursor: pointer;
      transition: border-color 0.2s ease, transform 0.15s ease;

      &:hover {
        border-color: #3f3f46;
        transform: translateY(-1px);
      }

      &.selected {
        border-color: #8b5cf6;
        box-shadow: 0 0 12px rgba(139, 92, 246, 0.15);
      }
    }

    .pers-icon {
      font-size: 28px;
      width: 28px;
      height: 28px;
      color: #8b5cf6;
      flex-shrink: 0;
      margin-top: 2px;
    }

    .pers-text {
      display: flex;
      flex-direction: column;
    }

    .pers-label {
      font-size: 15px;
      font-weight: 600;
      color: #fafafa;
    }

    .pers-desc {
      font-size: 12px;
      color: #71717a;
      margin-top: 2px;
    }

    /* Form Fields */
    .form-fields {
      display: flex;
      flex-direction: column;
      gap: 8px;

      .full-width {
        width: 100%;
      }
    }

    /* Create Action */
    .create-action {
      padding: 24px 0 16px;
    }

    .create-btn {
      border-radius: 10px;
      padding: 10px 32px;
      font-size: 16px;
      font-weight: 600;
    }

    .spin {
      animation: spin 1.5s linear infinite;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    /* Preview */
    .preview-label {
      font-size: 12px;
      font-weight: 600;
      color: #71717a;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 12px;
    }

    .preview-card {
      background: #18181b;
      border: 1px solid #27272a;
      border-radius: 20px;
      padding: 32px 24px;
      text-align: center;
      min-height: 300px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }

    .preview-avatar {
      width: 160px;
      height: 160px;
      border-radius: 20px;
      overflow: hidden;
      margin-bottom: 20px;
      border: 3px solid #8b5cf6;
      box-shadow: 0 0 24px rgba(139, 92, 246, 0.2);

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
    }

    .preview-name {
      font-size: 22px;
      font-weight: 700;
      color: #fafafa;
      margin: 0 0 10px;
      letter-spacing: -0.5px;
    }

    .preview-badge {
      display: inline-block;
      background: rgba(139, 92, 246, 0.15);
      color: #a78bfa;
      font-size: 13px;
      font-weight: 600;
      padding: 4px 14px;
      border-radius: 20px;
      margin-bottom: 10px;
      text-transform: capitalize;
    }

    .preview-voice {
      font-size: 14px;
      color: #71717a;
      margin: 0;
      display: flex;
      align-items: center;
      gap: 4px;

      .inline-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }
    }

    .preview-catchphrase {
      font-size: 13px;
      color: #a1a1aa;
      font-style: italic;
      margin: 12px 0 0;
      max-width: 250px;
      line-height: 1.4;
    }

    .preview-placeholder {
      color: #3f3f46;
      text-align: center;

      mat-icon {
        font-size: 64px;
        width: 64px;
        height: 64px;
        opacity: 0.3;
        margin-bottom: 12px;
      }

      p {
        font-size: 14px;
        color: #52525b;
        margin: 0;
      }
    }

    /* Responsive */
    @media (max-width: 900px) {
      .two-column {
        flex-direction: column-reverse;
      }

      .preview-column {
        width: 100%;
      }

      .preview-sticky {
        position: relative;
        top: 0;
      }

      .faces-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }
  `],
})
export class SellerCreateComponent implements OnInit {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  faces: SellerFace[] = [];
  voices: SellerVoice[] = [];
  selectedFace: SellerFace | null = null;
  selectedVoice: SellerVoice | null = null;
  selectedPersonality: string | null = null;
  sellerName = '';
  catchphrases = '';
  creating = false;
  uploading = false;

  // Custom face upload state
  uploadedFaceId: string | null = null;
  uploadedFaceUrl: string | null = null;

  personalities: PersonalityOption[] = [
    { key: 'informal', label: 'Informal', icon: 'sentiment_satisfied', desc: 'Fala como amigo, usa girias' },
    { key: 'formal', label: 'Formal', icon: 'business', desc: 'Profissional e direto' },
    { key: 'engracado', label: 'Engracado', icon: 'mood', desc: 'Usa humor para engajar' },
    { key: 'tecnico', label: 'Tecnico', icon: 'science', desc: 'Expert no assunto' },
    { key: 'persuasivo', label: 'Persuasivo', icon: 'psychology', desc: 'Convence com argumentos' },
  ];

  constructor(
    private sellerService: SellerService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.sellerService.getFaces().subscribe({
      next: (faces) => this.faces = faces,
    });
    this.sellerService.getVoices().subscribe({
      next: (voices) => this.voices = voices,
    });
  }

  selectFace(face: SellerFace): void {
    this.selectedFace = face;
    if (!this.sellerName) {
      this.sellerName = face.name;
    }
  }

  selectCustomFace(): void {
    if (this.uploadedFaceId && this.uploadedFaceUrl) {
      this.selectedFace = {
        id: this.uploadedFaceId,
        name: 'Personalizado',
        gender: 'other',
        age_range: '',
        style: 'custom',
        thumbnail_url: this.uploadedFaceUrl,
        is_custom: true,
      };
    }
  }

  triggerUpload(): void {
    this.fileInput.nativeElement.value = '';
    this.fileInput.nativeElement.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.uploading = true;
    this.sellerService.uploadFace(file).subscribe({
      next: (result) => {
        this.uploadedFaceId = result.face_id;
        // Build full URL for localhost dev
        const baseUrl = window.location.hostname === 'localhost'
          ? 'http://localhost:8000'
          : '';
        this.uploadedFaceUrl = baseUrl + result.thumbnail_url;
        this.uploading = false;

        // Auto-select the uploaded face
        this.selectCustomFace();
      },
      error: () => {
        this.uploading = false;
        window.alert('Erro ao enviar foto. Tente novamente.');
      },
    });
  }

  getPreviewImageUrl(): string {
    if (!this.selectedFace) return '';
    if (this.selectedFace.id.startsWith('custom') && this.uploadedFaceUrl) {
      return this.uploadedFaceUrl;
    }
    return this.selectedFace.thumbnail_url;
  }

  selectVoice(voice: SellerVoice): void {
    this.selectedVoice = voice;
  }

  selectPersonality(key: string): void {
    this.selectedPersonality = key;
  }

  getPersonalityLabel(key: string): string {
    return this.personalities.find(p => p.key === key)?.label || key;
  }

  canCreate(): boolean {
    return !!(this.selectedFace && this.selectedVoice && this.selectedPersonality && this.sellerName.trim());
  }

  create(): void {
    if (!this.canCreate() || this.creating) return;
    this.creating = true;

    const payload: any = {
      name: this.sellerName.trim(),
      avatar_face: this.selectedFace!.id,
      voice_id: this.selectedVoice!.id,
      personality: this.selectedPersonality!,
      language_style: '',
      catchphrases: this.catchphrases.trim(),
    };

    // If custom face, include the URL
    if (this.selectedFace!.id.startsWith('custom') && this.uploadedFaceUrl) {
      payload.avatar_face_url = this.uploadedFaceUrl;
    }

    this.sellerService.createSeller(payload).subscribe({
      next: () => {
        this.router.navigate(['/sellers']);
      },
      error: () => {
        this.creating = false;
        window.alert('Erro ao criar vendedor. Tente novamente.');
      },
    });
  }

  goBack(): void {
    this.router.navigate(['/sellers']);
  }
}
