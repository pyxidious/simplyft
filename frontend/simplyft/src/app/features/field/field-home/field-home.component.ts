import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthMockService } from '../../../core/services/auth-mock.service';
import { PlantMockService } from '../../../core/services/plant-mock.service';
import { SurveyMockService } from '../../../core/services/survey-mock.service';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';

@Component({
  selector: 'app-field-home',
  standalone: true,
  imports: [CommonModule, RouterLink, StatusBadgeComponent],
  template: `
    <section class="field-screen">
      <header class="mobile-hero">
        <div>
          <p class="muted">Buon lavoro</p>
          <h1>{{ auth.currentUser()?.name }}</h1>
          <app-status-badge label="Online" tone="success" />
        </div>
        <a class="btn primary" routerLink="/field/nuovo-rilievo">Nuovo Rilievo</a>
      </header>

      <div class="handoff-confirm" *ngIf="surveys.justSent()">
        Rilievo inviato al back-office. La dashboard commerciale e stata aggiornata.
      </div>

      <div class="mobile-stats">
        <article class="card"><span>Rilievi in corso</span><b>3</b></article>
        <article class="card"><span>Da completare</span><b>2</b></article>
      </div>

      <section class="section-head"><h2>Ultimi interventi</h2><a routerLink="/field/impianti">Vedi tutti</a></section>
      <article class="plant-mobile-card" *ngFor="let plant of plants.plants().slice(0, 3)">
        <div>
          <b>{{ plant.customer }}</b>
          <p>{{ plant.address }}</p>
          <small>{{ plant.lastSurvey }}</small>
        </div>
        <a class="btn ghost" [routerLink]="['/field/impianto', plant.id]">Apri</a>
      </article>
    </section>
  `
})
export class FieldHomeComponent {
  constructor(public auth: AuthMockService, public plants: PlantMockService, public surveys: SurveyMockService) {}
}
