import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PlantStatus } from '../../../core/models/simplyft.models';
import { PlantMockService } from '../../../core/services/plant-mock.service';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';

@Component({
  selector: 'app-plants-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, StatusBadgeComponent],
  template: `
    <section class="field-screen">
      <header class="page-title"><div><p class="muted">Clienti e impianti</p><h1>Lista impianti</h1></div></header>
      <div class="filters">
        <input [ngModel]="query()" (ngModelChange)="query.set($event)" placeholder="Cerca cliente, codice, marca" />
        <select [ngModel]="status()" (ngModelChange)="status.set($event)">
          <option value="all">Tutti</option>
          <option value="complete">Completo</option>
          <option value="incomplete">Incompleto</option>
          <option value="needs-review">Richiede verifica</option>
        </select>
      </div>
      <article class="plant-mobile-card" *ngFor="let plant of plants.search(query(), status())">
        <div>
          <b>{{ plant.customer }}</b>
          <p>{{ plant.code }} - {{ plant.brand }} {{ plant.model }}</p>
          <small>Ultimo rilievo {{ plant.lastSurvey }}</small>
        </div>
        <div class="card-actions">
          <app-status-badge [label]="label(plant.status)" [tone]="tone(plant.status)" />
          <a class="btn ghost" [routerLink]="['/field/impianto', plant.id]">Apri dettaglio</a>
        </div>
      </article>
    </section>
  `
})
export class PlantsListComponent {
  query = signal('');
  status = signal<PlantStatus | 'all'>('all');
  constructor(public plants: PlantMockService) {}
  label(status: PlantStatus): string { return status === 'complete' ? 'Completo' : status === 'incomplete' ? 'Incompleto' : 'Richiede verifica'; }
  tone(status: PlantStatus): 'success' | 'warning' | 'danger' { return status === 'complete' ? 'success' : status === 'incomplete' ? 'warning' : 'danger'; }
}
