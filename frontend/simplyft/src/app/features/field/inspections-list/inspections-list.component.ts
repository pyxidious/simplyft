import { CommonModule } from '@angular/common';
import { Component, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { InspectionService } from '../../../core/services/inspection.service';

@Component({
  selector: 'app-inspections-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="survey-workspace">
      <header class="survey-topbar">
        <a routerLink="/field/home" aria-label="Torna alla home">‹</a>
        <h1>Rilievi</h1>
        <a routerLink="/field/nuovo-rilievo" aria-label="Nuovo rilievo">＋</a>
      </header>

      <main class="survey-content inspections-list-page">
        <section class="list-hero">
          <div>
            <p class="eyebrow">Storico tecnico</p>
            <h2>Bozze e rilievi inviati</h2>
            <span>Le bozze restano visibili solo al tecnico proprietario.</span>
          </div>
          <a class="btn primary" routerLink="/field/nuovo-rilievo">Nuovo rilievo</a>
        </section>

        <article class="inspection-list-card" *ngFor="let inspection of visibleInspections()">
          <header>
            <div>
              <span class="status-badge" [class.warning]="inspection.status === 'DRAFT'" [class.success]="inspection.status === 'SUBMITTED'">
                {{ inspection.status === 'DRAFT' ? 'Bozza' : 'Inviato' }}
              </span>
              <h3>{{ inspection.customerName }}</h3>
              <p>{{ inspection.plantCode || 'Codice impianto non disponibile' }}</p>
            </div>
            <strong>{{ inspection.totalMaterialCost | currency:'EUR':'symbol':'1.2-2' }}</strong>
          </header>
          <div class="inspection-quick-row">
            <span>{{ inspection.totalLaborHours | number:'1.0-2' }}h manodopera</span>
            <button type="button">Apri</button>
          </div>
          <dl>
            <div>
              <dt>Creato</dt>
              <dd>{{ inspection.createdAt | date:'dd/MM/yyyy HH:mm' }}</dd>
            </div>
            <div>
              <dt>Ultima modifica</dt>
              <dd>{{ inspection.updatedAt | date:'dd/MM/yyyy HH:mm' }}</dd>
            </div>
            <div>
              <dt>Tecnico</dt>
              <dd>{{ inspection.technicianName }}</dd>
            </div>
            <div>
              <dt>Totale ore</dt>
              <dd>{{ inspection.totalLaborHours | number:'1.0-2' }}h</dd>
            </div>
          </dl>
        </article>

        <div class="empty-state large-empty" *ngIf="!visibleInspections().length">
          Nessun rilievo presente. Crea una bozza o invia un nuovo rilievo al commerciale.
        </div>
      </main>
    </section>
  `
})
export class InspectionsListComponent {
  visibleInspections = computed(() => {
    const user = this.auth.currentUser();
    return this.inspections.listForUser(user?.id ?? '', user?.role ?? 'tecnico');
  });

  constructor(private auth: AuthService, private inspections: InspectionService) {}
}
