import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnDestroy, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InspectionItem } from '../../../../core/models/simplyft.models';
import { InspectionService } from '../../../../core/services/inspection.service';

type VoiceState = 'idle' | 'recording' | 'recorded' | 'transcribing' | 'formalizing' | 'completed' | 'error';
type ApplyChoice = 'replace' | 'append';

@Component({
  selector: 'app-inspection-item-card',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <article class="inspection-item-card compact-item-card">
      <header>
        <div>
          <p class="eyebrow">Voce rilievo</p>
          <h3>{{ item.catalogItemName }}</h3>
          <small>{{ item.categoryName || 'Categoria non indicata' }}</small>
        </div>
        <div class="item-menu">
          <button type="button" title="Duplica voce" aria-label="Duplica voce" (click)="duplicate.emit(item)">⧉</button>
          <button type="button" title="Rimuovi voce" aria-label="Rimuovi voce" class="danger-icon" (click)="remove.emit(item)">⌫</button>
        </div>
      </header>

      <div class="item-fields">
        <label class="field">
          <span>Ore</span>
          <input type="number" min="0" step="0.25" [(ngModel)]="item.laborHours" (ngModelChange)="changed()" />
        </label>
        <label class="field">
          <span>Materiale</span>
          <input type="number" min="0" step="0.01" [(ngModel)]="item.materialCost" (ngModelChange)="changed()" />
        </label>
      </div>

      <section class="photo-section">
        <div class="photo-strip" *ngIf="item.photos.length">
          <figure *ngFor="let photo of item.photos; let index = index">
            <img *ngIf="photo.url" [src]="photo.url" [alt]="photo.fileName" />
            <figcaption>{{ photo.fileName }}</figcaption>
            <button type="button" (click)="removePhoto(index)">Rimuovi</button>
          </figure>
        </div>
        <label class="attach-button compact-attach">
          <input type="file" accept="image/*" capture="environment" (change)="addPhoto($event)" />
          <span>▣</span>
          <b>{{ item.photos.length ? 'Aggiungi foto' : 'Scatta foto' }}</b>
        </label>
      </section>

      <section class="ai-section">
        <label class="field">
          <span>Descrizione commerciale</span>
          <textarea [(ngModel)]="item.formalizedDescription" (ngModelChange)="changed()" placeholder="Sintesi chiara per commerciale o segreteria..."></textarea>
        </label>
        <button class="btn secondary wide compact-ai-button" type="button" (click)="formalizeDescription()" [disabled]="busyDescription()">
          <span>✧</span>
          {{ busyDescription() ? 'Elaborazione IA...' : aiButtonLabel() }}
        </button>
      </section>

      <section class="voice-section voice-recorder" [class.recording]="voiceState() === 'recording'">
        <div class="voice-recorder-top">
          <button
            type="button"
            class="mic-button"
            [class.stop]="voiceState() === 'recording'"
            (click)="toggleRecording()"
            [disabled]="voiceState() === 'transcribing' || voiceState() === 'formalizing'"
            [attr.aria-label]="voiceState() === 'recording' ? 'Ferma registrazione' : 'Registra nota vocale'"
          >
            {{ voiceState() === 'recording' ? '■' : '●' }}
          </button>
          <div>
            <strong>{{ voiceTitle() }}</strong>
            <small>{{ voiceSubtitle() }}</small>
          </div>
          <span class="voice-timer">{{ formattedDuration() }}</span>
        </div>

        <div class="voice-player" *ngIf="audioUrl()">
          <audio [src]="audioUrl()" controls></audio>
          <button type="button" class="btn ghost danger-text" (click)="resetRecording()">Elimina</button>
        </div>

        <button class="btn primary wide" type="button" *ngIf="voiceState() === 'recorded'" (click)="processRecording()">
          Elabora nota vocale
        </button>

        <p class="voice-error" *ngIf="voiceState() === 'error'">{{ voiceError() }}</p>

        <details class="transcript-box" *ngIf="item.transcribedNote">
          <summary>Trascrizione Whisper</summary>
          <textarea [(ngModel)]="item.transcribedNote" (ngModelChange)="changed()"></textarea>
        </details>

        <div class="formalized-note" *ngIf="formalizedVoiceText()">
          <span>Nota formalizzata</span>
          <p>{{ formalizedVoiceText() }}</p>
          <button class="btn secondary wide" type="button" (click)="openApplySheet()">Applica alla descrizione</button>
        </div>

        <label class="field">
          <span>Nota tecnica libera</span>
          <textarea [(ngModel)]="item.rawNote" (ngModelChange)="changed()" placeholder="Aggiungi dettagli rilevati sul campo..."></textarea>
        </label>
      </section>

      <div class="sheet-backdrop" *ngIf="applySheetOpen()" (click)="applySheetOpen.set(false)">
        <section class="bottom-sheet" (click)="$event.stopPropagation()">
          <span class="sheet-handle"></span>
          <h2>Applica nota vocale</h2>
          <p>La descrizione commerciale contiene gia testo. Come vuoi usare la nota formalizzata?</p>
          <div class="sheet-actions stacked">
            <button class="btn primary" type="button" (click)="applyVoiceText('replace')">Sostituisci</button>
            <button class="btn secondary" type="button" (click)="applyVoiceText('append')">Aggiungi in coda</button>
            <button class="btn ghost" type="button" (click)="applySheetOpen.set(false)">Annulla</button>
          </div>
        </section>
      </div>
    </article>
  `
})
export class InspectionItemCardComponent implements OnDestroy {
  @Input({ required: true }) item!: InspectionItem;
  @Output() itemChange = new EventEmitter<InspectionItem>();
  @Output() remove = new EventEmitter<InspectionItem>();
  @Output() duplicate = new EventEmitter<InspectionItem>();

  busyDescription = signal(false);
  voiceState = signal<VoiceState>('idle');
  voiceError = signal('');
  elapsedSeconds = signal(0);
  audioUrl = signal<string | undefined>(undefined);
  formalizedVoiceText = signal('');
  applySheetOpen = signal(false);

  private recorder?: MediaRecorder;
  private stream?: MediaStream;
  private chunks: Blob[] = [];
  private audioBlob?: Blob;
  private timerId?: number;

  constructor(private inspections: InspectionService) {}

  ngOnDestroy(): void {
    this.stopTimer();
    this.stream?.getTracks().forEach((track) => track.stop());
    const url = this.audioUrl();
    if (url) {
      URL.revokeObjectURL(url);
    }
  }

  changed(): void {
    this.itemChange.emit(this.item);
  }

  addPhoto(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    this.item.photos = [
      ...this.item.photos,
      {
        id: `photo-${Date.now()}`,
        fileName: file.name,
        contentType: file.type,
        url: URL.createObjectURL(file)
      }
    ];
    input.value = '';
    this.changed();
  }

  removePhoto(index: number): void {
    this.item.photos = this.item.photos.filter((_, current) => current !== index);
    this.changed();
  }

  formalizeDescription(): void {
    this.busyDescription.set(true);
    this.item.pendingOperation = true;
    this.changed();
    this.inspections.formalizeDescription(this.item).subscribe({
      next: (text) => {
        this.item.formalizedDescription = text;
        this.busyDescription.set(false);
        this.item.pendingOperation = false;
        this.changed();
      },
      error: () => {
        this.busyDescription.set(false);
        this.item.pendingOperation = false;
        this.changed();
      }
    });
  }

  aiButtonLabel(): string {
    return this.item.formalizedDescription?.trim() ? 'Formalizza testo IA' : 'Genera descrizione IA';
  }

  async toggleRecording(): Promise<void> {
    if (this.voiceState() === 'recording') {
      this.stopRecording();
      return;
    }
    await this.startRecording();
  }

  async startRecording(): Promise<void> {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      this.voiceError.set('Registrazione audio non supportata da questo browser.');
      this.voiceState.set('error');
      return;
    }
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.chunks = [];
      this.recorder = new MediaRecorder(this.stream);
      this.recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.chunks.push(event.data);
        }
      };
      this.recorder.onstop = () => this.finishRecording();
      this.elapsedSeconds.set(0);
      this.voiceState.set('recording');
      this.recorder.start();
      this.startTimer();
    } catch {
      this.voiceError.set('Consenti l accesso al microfono per registrare la nota vocale.');
      this.voiceState.set('error');
    }
  }

  stopRecording(): void {
    this.recorder?.stop();
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stopTimer();
  }

  processRecording(): void {
    if (!this.audioBlob) {
      return;
    }
    this.voiceState.set('transcribing');
    this.item.pendingOperation = true;
    this.changed();
    this.inspections.transcribeAudio(this.audioBlob).subscribe({
      next: (transcript) => {
        this.item.transcribedNote = transcript;
        this.voiceState.set('formalizing');
        this.changed();
        this.inspections.formalizeTranscription(transcript, this.item).subscribe({
          next: (formalized) => {
            this.formalizedVoiceText.set(formalized);
            this.voiceState.set('completed');
            this.item.pendingOperation = false;
            if (!this.item.formalizedDescription?.trim()) {
              this.item.formalizedDescription = formalized;
            } else {
              this.applySheetOpen.set(true);
            }
            this.changed();
          },
          error: () => this.failVoiceProcessing()
        });
      },
      error: () => this.failVoiceProcessing()
    });
  }

  resetRecording(): void {
    const url = this.audioUrl();
    if (url) {
      URL.revokeObjectURL(url);
    }
    this.audioUrl.set(undefined);
    this.audioBlob = undefined;
    this.formalizedVoiceText.set('');
    this.elapsedSeconds.set(0);
    this.voiceState.set('idle');
    this.voiceError.set('');
  }

  openApplySheet(): void {
    if (!this.item.formalizedDescription?.trim()) {
      this.applyVoiceText('replace');
      return;
    }
    this.applySheetOpen.set(true);
  }

  applyVoiceText(choice: ApplyChoice): void {
    const text = this.formalizedVoiceText().trim();
    if (!text) {
      return;
    }
    this.item.formalizedDescription = choice === 'append' && this.item.formalizedDescription?.trim()
      ? `${this.item.formalizedDescription.trim()}\n${text}`
      : text;
    this.applySheetOpen.set(false);
    this.changed();
  }

  formattedDuration(): string {
    const seconds = this.elapsedSeconds();
    const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
    const rest = (seconds % 60).toString().padStart(2, '0');
    return `${minutes}:${rest}`;
  }

  voiceTitle(): string {
    const labels: Record<VoiceState, string> = {
      idle: 'Nota vocale',
      recording: 'Registrazione in corso',
      recorded: 'Audio pronto',
      transcribing: 'Trascrizione Whisper',
      formalizing: 'Formalizzazione IA',
      completed: 'Nota elaborata',
      error: 'Microfono non disponibile'
    };
    return labels[this.voiceState()];
  }

  voiceSubtitle(): string {
    const labels: Record<VoiceState, string> = {
      idle: 'Tocca il microfono per iniziare',
      recording: 'Tocca stop quando hai finito',
      recorded: 'Riascolta o invia a Whisper',
      transcribing: 'Audio inviato al servizio',
      formalizing: 'Testo in pulizia per commerciale',
      completed: 'Puoi applicarla alla descrizione',
      error: 'Controlla i permessi del browser'
    };
    return labels[this.voiceState()];
  }

  private finishRecording(): void {
    this.audioBlob = new Blob(this.chunks, { type: this.recorder?.mimeType || 'audio/webm' });
    const previousUrl = this.audioUrl();
    if (previousUrl) {
      URL.revokeObjectURL(previousUrl);
    }
    this.audioUrl.set(URL.createObjectURL(this.audioBlob));
    this.voiceState.set('recorded');
  }

  private startTimer(): void {
    this.stopTimer();
    this.timerId = window.setInterval(() => this.elapsedSeconds.update((value) => value + 1), 1000);
  }

  private stopTimer(): void {
    if (this.timerId) {
      window.clearInterval(this.timerId);
      this.timerId = undefined;
    }
  }

  private failVoiceProcessing(): void {
    this.voiceState.set('error');
    this.voiceError.set('Non e stato possibile elaborare la nota vocale. Riprova o inserisci una nota testuale.');
    this.item.pendingOperation = false;
    this.changed();
  }
}
