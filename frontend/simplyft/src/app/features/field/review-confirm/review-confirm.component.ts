import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SurveyMockService } from '../../../core/services/survey-mock.service';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';

@Component({
  selector: 'app-review-confirm',
  standalone: true,
  imports: [CommonModule, RouterLink, StatusBadgeComponent],
  template: `
    <section class="field-screen" *ngIf="survey.latest() as item">
      <header class="page-title"><div><p class="muted">Verifica e conferma</p><h1>Riepilogo rilievo</h1></div><app-status-badge [label]="item.reliability + '% AI'" tone="info" /></header>
      <section class="card reliability-card">
        <div class="radial">{{ item.reliability }}%</div>
        <div><b>Affidabilita dati</b><p>I dati sono pronti per il back-office con campi normalizzati e warning espliciti.</p></div>
      </section>
      <div class="split">
        <article class="card"><h2>Campi completi</h2><p *ngFor="let field of item.completedFields">OK {{ field }}</p></article>
        <article class="card"><h2>Campi mancanti</h2><p *ngFor="let field of item.missingFields">! {{ field }}</p></article>
      </div>
      <article class="card"><h2>Suggerimenti AI</h2><p *ngFor="let suggestion of item.aiSuggestions">- {{ suggestion }}</p></article>
      <div class="sticky-actions">
        <a class="btn secondary" routerLink="/field/nuovo-rilievo">Torna al rilievo</a>
        <a class="btn primary" routerLink="/office/dashboard">Conferma e invia</a>
      </div>
    </section>
  `
})
export class ReviewConfirmComponent {
  constructor(public survey: SurveyMockService) {}
}
