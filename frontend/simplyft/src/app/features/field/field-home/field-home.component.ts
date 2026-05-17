import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SurveyMockService } from '../../../core/services/survey-mock.service';
import { FieldHomeActivity, FieldHomeService } from '../../../core/services/field-home.service';

@Component({
  selector: 'app-field-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="technician-home">
      <header class="tech-topbar">
        <a class="tech-brand" routerLink="/field/home">Simplyft</a>
        <a class="sync-button" routerLink="/settings" aria-label="Sincronizzazione">
          <span class="sync-glyph">↕</span>
        </a>
      </header>

      <main class="tech-content">
        <section class="welcome-row">
          <div>
            <p>Bentornato, tecnico</p>
            <h1>{{ home.home().technician.name }}</h1>
          </div>
          <div class="online-pill" [class.offline]="!home.home().technician.online">
            <span></span>
            Stato: {{ home.home().technician.online ? 'Online' : 'Offline' }}
          </div>
        </section>

        <div class="handoff-confirm tech-confirm" *ngIf="surveys.justSent()">
          Rilievo inviato al back-office. La dashboard commerciale e stata aggiornata.
        </div>

        <a class="primary-survey-card" routerLink="/field/nuovo-rilievo">
          <span class="survey-icon">
            <span class="checkmark">✓</span>
          </span>
          <strong>Nuovo Rilievo</strong>
          <small>Avvia nuovo rilievo tecnico</small>
        </a>

        <section class="quick-actions" aria-label="Azioni rapide">
          <a class="quick-card" routerLink="/field/impianti">
            <span class="quick-icon parts-icon"></span>
            <strong>Catalogo ricambi</strong>
          </a>
          <a class="quick-card" routerLink="/settings">
            <span class="quick-icon sync-icon">↔</span>
            <strong>Stato sincronizzazione</strong>
          </a>
        </section>

        <section class="assigned-section">
          <div class="tech-section-head">
            <h2>Attività assegnate</h2>
            <a routerLink="/field/impianti">Visualizza tutto</a>
          </div>

          <a class="assigned-card" *ngFor="let activity of home.home().assignedActivities" routerLink="/field/impianti">
            <span class="activity-icon" [class.safety]="activity.type === 'safety'">
              {{ iconFor(activity) }}
            </span>
            <span class="activity-copy">
              <b>#{{ activity.code }}</b>
              <strong>{{ activity.title }}</strong>
              <small>{{ activity.location }}</small>
            </span>
            <span class="chevron">›</span>
          </a>
        </section>

        <article class="system-notice">
          <div>
            <p><span>i</span> Notifica di sistema</p>
            <h2>{{ home.home().notification.title }}</h2>
            <small>{{ home.home().notification.message }}</small>
          </div>
          <span class="notice-watermark">✓</span>
        </article>
      </main>
    </section>
  `
})
export class FieldHomeComponent implements OnInit {
  constructor(public home: FieldHomeService, public surveys: SurveyMockService) {}

  ngOnInit(): void {
    this.home.load();
  }

  iconFor(activity: FieldHomeActivity): string {
    return activity.type === 'safety' ? '▣' : '♙';
  }
}
