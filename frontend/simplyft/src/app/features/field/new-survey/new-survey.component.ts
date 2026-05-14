import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { Router } from '@angular/router';
import { SurveyStep } from '../../../core/models/simplyft.models';
import { SurveyMockService } from '../../../core/services/survey-mock.service';
import { ChecklistComponent } from '../../../shared/components/checklist/checklist.component';
import { StepperComponent } from '../../../shared/components/stepper/stepper.component';
import { UploadMockComponent } from '../../../shared/components/upload-mock/upload-mock.component';
import { VoiceNoteMockComponent } from '../../../shared/components/voice-note-mock/voice-note-mock.component';

@Component({
  selector: 'app-new-survey',
  standalone: true,
  imports: [CommonModule, StepperComponent, UploadMockComponent, VoiceNoteMockComponent, ChecklistComponent],
  template: `
    <section class="field-screen">
      <header class="page-title"><div><p class="muted">Wizard guidato</p><h1>Nuovo rilievo</h1></div></header>
      <app-stepper [steps]="steps()" [activeIndex]="active()" />

      <article class="card wizard-panel">
        <p class="muted">Step {{ active() + 1 }} di {{ steps().length }}</p>
        <h2>{{ steps()[active()].title }}</h2>
        <ng-container [ngSwitch]="active()">
          <div *ngSwitchCase="0" class="form-grid"><input value="Condominio Aurora" /><input value="BG-AUR-02" /><input value="Kone MonoSpace 500" /></div>
          <div *ngSwitchCase="1" class="measure-grid"><input value="Vano 1450 mm" /><input value="Corsa 18.4 m" /><input value="7 fermate" /><input value="Portata 630 kg" /></div>
          <app-upload-mock *ngSwitchCase="2" [attachments]="[]" />
          <app-voice-note-mock *ngSwitchCase="3" />
          <app-checklist *ngSwitchCase="4" [items]="checklist" />
          <div *ngSwitchCase="5" class="send-box"><b>Rilievo pronto per verifica</b><p>2 warning verranno evidenziati al back-office.</p></div>
        </ng-container>
        <div class="warning-box" *ngIf="active() === 4">Mancano foto targhetta motore e firma referente.</div>
      </article>

      <div class="sticky-actions">
        <button class="btn secondary" (click)="saveDraft()">Salva bozza</button>
        <button class="btn ghost" (click)="prev()" [disabled]="active() === 0">Indietro</button>
        <button class="btn primary" (click)="next()">{{ active() === steps().length - 1 ? 'Invia al back-office' : 'Avanti' }}</button>
      </div>
    </section>
  `
})
export class NewSurveyComponent {
  active = signal(0);
  steps = signal<SurveyStep[]>([
    { id: 1, title: 'Identificazione impianto', complete: true },
    { id: 2, title: 'Misure e componenti', complete: false },
    { id: 3, title: 'Foto e allegati', complete: false },
    { id: 4, title: 'Note vocali/testuali', complete: false },
    { id: 5, title: 'Checklist dati obbligatori', complete: false },
    { id: 6, title: 'Conferma invio', complete: false }
  ]);
  checklist = [
    { label: 'Cliente confermato', done: true },
    { label: 'Codice impianto presente', done: true },
    { label: 'Misure vano inserite', done: true },
    { label: 'Foto targhetta motore', done: false },
    { label: 'Firma referente', done: false }
  ];
  constructor(private router: Router, private surveys: SurveyMockService) {}
  next(): void {
    if (this.active() === this.steps().length - 1) {
      this.surveys.sendMockSurvey();
      this.router.navigateByUrl('/field/verifica-conferma');
      return;
    }
    this.steps.update((steps) => steps.map((step, index) => index === this.active() ? { ...step, complete: true } : step));
    this.active.update((value) => value + 1);
  }
  prev(): void { this.active.update((value) => Math.max(0, value - 1)); }
  saveDraft(): void { this.steps.update((steps) => [...steps]); }
}
