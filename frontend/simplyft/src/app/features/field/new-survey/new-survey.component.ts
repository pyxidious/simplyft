import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CatalogItem, CustomerPlant, InspectionDraft, InspectionItem } from '../../../core/models/simplyft.models';
import { AuthService } from '../../../core/services/auth.service';
import { InspectionService } from '../../../core/services/inspection.service';
import { CatalogObjectPickerComponent } from './components/catalog-object-picker.component';
import { CustomerPlantSelectorComponent } from './components/customer-plant-selector.component';
import { InspectionItemCardComponent } from './components/inspection-item-card.component';

@Component({
  selector: 'app-new-survey',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    CustomerPlantSelectorComponent,
    CatalogObjectPickerComponent,
    InspectionItemCardComponent
  ],
  template: `
    <section class="survey-workspace">
      <header class="survey-topbar">
        <a routerLink="/field/rilievi" aria-label="Torna ai rilievi">‹</a>
        <h1>Nuovo Rilievo</h1>
        <a routerLink="/settings" aria-label="Sincronizzazione">↕</a>
      </header>

      <main class="survey-content inspection-content">
        <div class="feedback success-feedback" *ngIf="feedback()">{{ feedback() }}</div>
        <div class="feedback error-feedback" *ngIf="errors().length">
          <strong>Controlla prima di inviare</strong>
          <p *ngFor="let error of errors()">{{ error }}</p>
        </div>

        <app-customer-plant-selector
          [selected]="selectedCustomer()"
          (selectedChange)="selectCustomer($event)"
        />

        <section class="survey-metrics sticky-summary" aria-label="Riepilogo rilievo">
          <article class="metric-card">
            <span>Totale ore</span>
            <strong>{{ totalLaborHours() | number:'1.0-2' }}h</strong>
          </article>
          <article class="metric-card warm">
            <span>Materiali</span>
            <strong>{{ totalMaterialCost() | currency:'EUR':'symbol':'1.2-2' }}</strong>
          </article>
        </section>

        <app-catalog-object-picker (itemSelected)="requestAddItem($event)" />

        <section class="inserted-section">
          <div class="survey-section-title">
            <h2>Oggetti rilevati</h2>
            <small>{{ items().length }} {{ items().length === 1 ? 'voce' : 'voci' }}</small>
          </div>

          <div class="empty-state large-empty" *ngIf="!items().length">
            Aggiungi almeno un oggetto dal catalogo per iniziare il rilievo.
          </div>

          <app-inspection-item-card
            *ngFor="let item of items(); trackBy: trackItem"
            [item]="item"
            (itemChange)="updateItem($event)"
            (remove)="requestRemoveItem($event)"
            (duplicate)="duplicateItem($event)"
          />
        </section>

        <div class="mobile-page-actions" aria-label="Azioni rilievo corrente">
          <button type="button" routerLink="/field/rilievi" title="Elenco rilievi" aria-label="Elenco rilievi">
            <span>▤</span>
            <small>Elenco</small>
          </button>
          <button type="button" (click)="scrollToCatalog()" title="Aggiungi voce" aria-label="Aggiungi voce">
            <span>＋</span>
            <small>Voce</small>
          </button>
          <button type="button" (click)="saveDraft()" [disabled]="saving()" title="Salva bozza" aria-label="Salva bozza">
            <span>{{ saving() ? '…' : '▣' }}</span>
            <small>Bozza</small>
          </button>
          <button type="button" class="primary-action" (click)="requestSubmit()" [disabled]="saving()" title="Invia al commerciale" aria-label="Invia al commerciale">
            <span>{{ saving() ? '…' : '➤' }}</span>
            <small>Invia</small>
          </button>
        </div>
      </main>

      <div class="sheet-backdrop" *ngIf="pendingCatalogItem()" (click)="pendingCatalogItem.set(undefined)">
        <section class="bottom-sheet" (click)="$event.stopPropagation()">
          <span class="sheet-handle"></span>
          <h2>Aggiungi voce</h2>
          <p>Vuoi aggiungere "{{ pendingCatalogItem()?.name }}" al rilievo?</p>
          <div class="sheet-actions">
            <button class="btn ghost" type="button" (click)="pendingCatalogItem.set(undefined)">Annulla</button>
            <button class="btn primary" type="button" (click)="confirmAddItem()">Aggiungi</button>
          </div>
        </section>
      </div>

      <div class="sheet-backdrop" *ngIf="pendingRemoveItem()" (click)="pendingRemoveItem.set(undefined)">
        <section class="bottom-sheet" (click)="$event.stopPropagation()">
          <span class="sheet-handle"></span>
          <h2>Rimuovi voce</h2>
          <p>Vuoi rimuovere "{{ pendingRemoveItem()?.catalogItemName }}" dal rilievo?</p>
          <div class="sheet-actions">
            <button class="btn ghost" type="button" (click)="pendingRemoveItem.set(undefined)">Annulla</button>
            <button class="btn danger" type="button" (click)="confirmRemoveItem()">Rimuovi</button>
          </div>
        </section>
      </div>

      <div class="sheet-backdrop" *ngIf="submitSheetOpen()" (click)="submitSheetOpen.set(false)">
        <section class="bottom-sheet" (click)="$event.stopPropagation()">
          <span class="sheet-handle"></span>
          <h2>Invia al commerciale</h2>
          <p>Il rilievo diventera visibile al commerciale. Confermi l'invio?</p>
          <p class="sheet-warning" *ngIf="hasPendingOperations()">Alcune elaborazioni IA o vocali sono ancora in corso.</p>
          <div class="sheet-actions">
            <button class="btn ghost" type="button" (click)="submitSheetOpen.set(false)">Annulla</button>
            <button class="btn primary" type="button" (click)="submit()">Invia</button>
          </div>
        </section>
      </div>
    </section>
  `
})
export class NewSurveyComponent {
  selectedCustomer = signal<CustomerPlant | undefined>(undefined);
  items = signal<InspectionItem[]>([]);
  saving = signal(false);
  feedback = signal('');
  errors = signal<string[]>([]);
  pendingCatalogItem = signal<CatalogItem | undefined>(undefined);
  pendingRemoveItem = signal<InspectionItem | undefined>(undefined);
  submitSheetOpen = signal(false);

  totalLaborHours = computed(() => this.items().reduce((sum, item) => sum + this.asNumber(item.laborHours), 0));
  totalMaterialCost = computed(() => this.items().reduce((sum, item) => sum + this.asNumber(item.materialCost), 0));

  constructor(
    private router: Router,
    private auth: AuthService,
    private inspections: InspectionService
  ) {}

  selectCustomer(customer: CustomerPlant): void {
    this.selectedCustomer.set(customer);
    this.errors.set([]);
  }

  requestAddItem(catalogItem: CatalogItem): void {
    this.pendingCatalogItem.set(catalogItem);
  }

  confirmAddItem(): void {
    const catalogItem = this.pendingCatalogItem();
    if (!catalogItem) {
      return;
    }
    const item: InspectionItem = {
      id: `line-${Date.now()}`,
      catalogItemId: catalogItem.id,
      catalogItemName: catalogItem.name,
      categoryName: catalogItem.categoryName,
      laborHours: catalogItem.standardLaborHours ?? 0,
      materialCost: catalogItem.listMaterialPrice ?? 0,
      photos: [],
      formalizedDescription: catalogItem.shortDescription
    };
    this.items.update((items) => [item, ...items]);
    this.pendingCatalogItem.set(undefined);
    this.feedback.set('Voce aggiunta al rilievo.');
    this.errors.set([]);
  }

  updateItem(updated: InspectionItem): void {
    this.items.update((items) => items.map((item) => item.id === updated.id ? { ...updated } : item));
  }

  requestRemoveItem(removed: InspectionItem): void {
    this.pendingRemoveItem.set(removed);
  }

  confirmRemoveItem(): void {
    const removed = this.pendingRemoveItem();
    if (!removed) {
      return;
    }
    this.items.update((items) => items.filter((item) => item.id !== removed.id));
    this.pendingRemoveItem.set(undefined);
    this.feedback.set('Voce rimossa dal rilievo.');
  }

  duplicateItem(source: InspectionItem): void {
    this.items.update((items) => [{ ...source, id: `line-${Date.now()}`, photos: [...source.photos] }, ...items]);
  }

  saveDraft(): void {
    const draft = this.buildDraft('DRAFT');
    if (!draft) {
      return;
    }
    this.persistDraft(draft, "Bozza salvata. La trovi nell'elenco rilievi come Bozza.");
  }

  requestSubmit(): void {
    const validationErrors = this.validateForSubmit();
    if (validationErrors.length) {
      this.errors.set(validationErrors);
      return;
    }
    this.submitSheetOpen.set(true);
  }

  submit(): void {
    const draft = this.buildDraft('SUBMITTED');
    if (!draft) {
      return;
    }
    this.submitSheetOpen.set(false);
    this.saving.set(true);
    this.inspections.submit(draft).subscribe(() => {
      this.saving.set(false);
      this.feedback.set('Rilievo inviato al commerciale.');
      this.router.navigateByUrl('/field/rilievi');
    });
  }

  scrollToCatalog(): void {
    document.querySelector('app-catalog-object-picker')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  hasPendingOperations(): boolean {
    return this.items().some((item) => item.pendingOperation);
  }

  trackItem(_index: number, item: InspectionItem): string {
    return item.id ?? item.catalogItemId;
  }

  private persistDraft(draft: InspectionDraft, message: string): void {
    this.saving.set(true);
    this.inspections.saveDraft(draft).subscribe(() => {
      this.saving.set(false);
      this.feedback.set(message);
      this.errors.set([]);
    });
  }

  private buildDraft(status: 'DRAFT' | 'SUBMITTED'): InspectionDraft | undefined {
    const user = this.auth.currentUser();
    const customer = this.selectedCustomer();
    if (!user) {
      this.errors.set(["Utente tecnico non disponibile. Effettua nuovamente l'accesso."]);
      return undefined;
    }
    if (!customer && status === 'SUBMITTED') {
      this.errors.set(['Seleziona un cliente o impianto.']);
      return undefined;
    }
    return {
      customerId: customer?.id ?? 'draft-unassigned',
      customerName: customer?.customerName ?? 'Cliente da selezionare',
      plantCode: customer?.plantCode,
      plantAddress: customer?.address,
      status,
      technicianId: user.id,
      technicianName: user.name,
      items: this.items(),
      totalLaborHours: this.totalLaborHours(),
      totalMaterialCost: this.totalMaterialCost()
    };
  }

  private validateForSubmit(): string[] {
    const errors: string[] = [];
    if (!this.selectedCustomer()) {
      errors.push('Seleziona cliente o impianto.');
    }
    if (!this.items().length) {
      errors.push('Inserisci almeno una voce del rilievo.');
    }
    this.items().forEach((item, index) => {
      if (!item.catalogItemId) {
        errors.push(`Voce ${index + 1}: oggetto catalogo mancante.`);
      }
      if (!Number.isFinite(Number(item.laborHours)) || Number(item.laborHours) < 0) {
        errors.push(`Voce ${index + 1}: ore manodopera non valide.`);
      }
      if (!Number.isFinite(Number(item.materialCost)) || Number(item.materialCost) < 0) {
        errors.push(`Voce ${index + 1}: prezzo materiale non valido.`);
      }
    });
    return errors;
  }

  private asNumber(value: number): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
}
