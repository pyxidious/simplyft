import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CatalogItem, CustomerPlant, InspectionDraft, InspectionItem } from '../../../core/models/simplyft.models';
import { AuthService } from '../../../core/services/auth.service';
import { InspectionService } from '../../../core/services/inspection.service';
import { CatalogObjectPickerComponent } from './components/catalog-object-picker.component';
import { CustomerPlantSelectorComponent } from './components/customer-plant-selector.component';
import { InspectionItemCardComponent } from './components/inspection-item-card.component';

@Component({
  selector: 'app-new-survey',
    imports: [
      CommonModule,
      RouterLink,
      CustomerPlantSelectorComponent,
      CatalogObjectPickerComponent,
      InspectionItemCardComponent
    ],
  templateUrl: './new-survey.component.html',
  styleUrl: './new-survey.component.css'
})

export class NewSurveyComponent implements OnInit {
  draftId = signal<string | undefined>(undefined);
  loadingDraft = signal(false);
  inspectionStatus = signal<InspectionDraft['status']>('DRAFT');
  createdAt = signal<string | undefined>(undefined);
  updatedAt = signal<string | undefined>(undefined);
  submittedAt = signal<string | undefined>(undefined);
  technicianName = signal('');
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
  readOnly = computed(() => this.inspectionStatus() !== 'DRAFT');

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    public auth: AuthService,
    private inspections: InspectionService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') ?? undefined;
    if (!id) {
      return;
    }
    this.draftId.set(id);
    this.loadingDraft.set(true);
    const request = this.router.url.includes('/bozze/')
      ? this.inspections.getDraft(id)
      : this.inspections.getInspection(id);
    request.subscribe({
      next: (draft) => {
        this.populateDraft(draft);
        this.loadingDraft.set(false);
      },
      error: (error) => {
        this.loadingDraft.set(false);
        this.errors.set([error.status === 403 || error.status === 404
          ? 'Bozza non trovata o non accessibile con questo tecnico.'
          : 'Impossibile caricare la bozza.']);
      }
    });
  }

  selectCustomer(customer: CustomerPlant): void {
    if (this.readOnly()) {
      return;
    }
    this.selectedCustomer.set(customer);
    this.errors.set([]);
  }

  requestAddItem(catalogItem: CatalogItem): void {
    if (this.readOnly()) {
      return;
    }
    this.pendingCatalogItem.set(catalogItem);
  }

  confirmAddItem(): void {
    if (this.readOnly()) {
      return;
    }
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
      originalTechnicalDescription: catalogItem.shortDescription,
      formalizedDescription: catalogItem.shortDescription
    };
    this.items.update((items) => [item, ...items]);
    this.pendingCatalogItem.set(undefined);
    this.feedback.set('Voce aggiunta al rilievo.');
    this.errors.set([]);
  }

  updateItem(updated: InspectionItem): void {
    if (this.readOnly()) {
      return;
    }
    this.items.update((items) => items.map((item) => item.id === updated.id ? { ...updated } : item));
  }

  requestRemoveItem(removed: InspectionItem): void {
    if (this.readOnly()) {
      return;
    }
    this.pendingRemoveItem.set(removed);
  }

  confirmRemoveItem(): void {
    if (this.readOnly()) {
      return;
    }
    const removed = this.pendingRemoveItem();
    if (!removed) {
      return;
    }
    this.items.update((items) => items.filter((item) => item.id !== removed.id));
    this.pendingRemoveItem.set(undefined);
    this.feedback.set('Voce rimossa dal rilievo.');
  }

  duplicateItem(source: InspectionItem): void {
    if (this.readOnly()) {
      return;
    }
    this.items.update((items) => [{ ...source, id: `line-${Date.now()}`, photos: [...source.photos] }, ...items]);
  }

  saveDraft(): void {
    if (this.readOnly()) {
      this.errors.set(['Il rilievo e gia stato inviato e non puo essere modificato.']);
      return;
    }
    const draft = this.buildDraft('DRAFT');
    if (!draft) {
      return;
    }
    this.persistDraft(draft, "Bozza salvata. La trovi nell'elenco rilievi come Bozza.");
  }

  requestSubmit(): void {
    if (this.readOnly()) {
      this.errors.set(['Il rilievo e gia stato inviato.']);
      return;
    }
    if (this.saving()) {
      return;
    }
    const validationErrors = this.validateForSubmit();
    if (validationErrors.length) {
      this.errors.set(validationErrors);
      return;
    }
    this.submitSheetOpen.set(true);
  }

  submit(): void {
    if (this.readOnly()) {
      this.submitSheetOpen.set(false);
      this.errors.set(['Il rilievo e gia stato inviato.']);
      return;
    }
    if (this.saving()) {
      return;
    }
    const validationErrors = this.validateForSubmit();
    if (validationErrors.length) {
      this.errors.set(validationErrors);
      this.submitSheetOpen.set(false);
      return;
    }
    const draft = this.buildDraft('SUBMITTED');
    if (!draft) {
      return;
    }
    this.submitSheetOpen.set(false);
    this.saving.set(true);
    this.errors.set([]);
    this.inspections.submit(draft).subscribe({
      next: () => {
        this.saving.set(false);
        this.feedback.set('Rilievo inviato al commerciale.');
        this.router.navigateByUrl('/tecnico/rilievi', {
          state: { feedback: 'Rilievo inviato al commerciale.' }
        });
      },
      error: () => {
        this.saving.set(false);
        this.errors.set(['Invio rilievo non riuscito. Riprova tra poco.']);
      }
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
    this.inspections.saveDraft(draft).subscribe({
      next: (saved) => {
        this.saving.set(false);
        this.draftId.set(saved.id);
        this.feedback.set(message);
        this.errors.set([]);
      },
      error: (error) => {
        this.saving.set(false);
        this.errors.set([error.status === 403 ? 'Non puoi modificare questa bozza.' : 'Salvataggio bozza non riuscito.']);
      }
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
      id: this.draftId(),
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

  private populateDraft(draft: InspectionDraft): void {
    this.draftId.set(draft.id);
    this.inspectionStatus.set(draft.status);
    this.createdAt.set(draft.createdAt);
    this.updatedAt.set(draft.updatedAt);
    this.submittedAt.set(draft.submittedAt);
    this.technicianName.set(draft.technicianName);
    if (draft.customerId) {
      this.selectedCustomer.set({
        id: draft.customerId,
        customerName: draft.customerName,
        plantCode: draft.plantCode,
        address: draft.plantAddress
      });
    }
    this.items.set((draft.items ?? []).map((item) => ({
      ...item,
      originalTechnicalDescription: item.originalTechnicalDescription ?? item.formalizedDescription ?? item.catalogItemName
    })));
    this.feedback.set('');
    this.errors.set([]);
  }
}
