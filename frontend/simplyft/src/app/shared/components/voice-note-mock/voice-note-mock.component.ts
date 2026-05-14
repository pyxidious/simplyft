import { CommonModule } from '@angular/common';
import { Component, Input, signal } from '@angular/core';
import { VoiceNote } from '../../../core/models/simplyft.models';

@Component({
  selector: 'app-voice-note-mock',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="voice-card">
      <button type="button" class="btn secondary" (click)="recording.set(!recording())">{{ recording() ? 'Ferma registrazione' : 'Registra nota vocale' }}</button>
      <span class="pulse" *ngIf="recording()">REC 00:12</span>
    </div>
    <article class="note-row" *ngFor="let note of notes">
      <b>{{ note.title }}</b>
      <span>{{ note.duration }}</span>
      <p>{{ note.transcript }}</p>
    </article>
  `
})
export class VoiceNoteMockComponent {
  @Input() notes: VoiceNote[] = [];
  recording = signal(false);
}
