import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnDestroy, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InspectionItem } from '../../../../core/models/simplyft.models';
import { InspectionService } from '../../../../core/services/inspection.service';

type VoiceState = 'idle' | 'recording' | 'recorded' | 'transcribing' | 'formalizing' | 'completed' | 'error';
type ApplyChoice = 'replace' | 'append';

@Component({
  selector: 'app-inspection-item-card',
  imports: [CommonModule, FormsModule],
  templateUrl: './inspection-item-card.component.html',
  styleUrl: './inspection-item-card.component.css'
})

export class InspectionItemCardComponent implements OnDestroy {
  @Input({ required: true }) item!: InspectionItem;
  @Input() readOnly = false;
  @Output() itemChange = new EventEmitter<InspectionItem>();
  @Output() remove = new EventEmitter<InspectionItem>();
  @Output() duplicate = new EventEmitter<InspectionItem>();

  busyDescription = signal(false);
  descriptionError = signal('');
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
    if (this.readOnly) {
      return;
    }
    this.itemChange.emit(this.item);
  }

  addPhoto(event: Event): void {
    if (this.readOnly) {
      return;
    }
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
    if (this.readOnly) {
      return;
    }
    this.item.photos = this.item.photos.filter((_, current) => current !== index);
    this.changed();
  }

  formalizeDescription(): void {
    if (this.readOnly || this.busyDescription()) {
      return;
    }
    this.busyDescription.set(true);
    this.descriptionError.set('');
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
        this.descriptionError.set('Formalizzazione IA non riuscita');
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
    if (this.readOnly) {
      return;
    }
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
    if (this.readOnly || !this.audioBlob) {
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
    if (this.readOnly) {
      return;
    }
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
    if (this.readOnly) {
      return;
    }
    if (!this.item.formalizedDescription?.trim()) {
      this.applyVoiceText('replace');
      return;
    }
    this.applySheetOpen.set(true);
  }

  applyVoiceText(choice: ApplyChoice): void {
    if (this.readOnly) {
      return;
    }
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
