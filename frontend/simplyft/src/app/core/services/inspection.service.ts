import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, computed, signal } from '@angular/core';
import { Observable, catchError, map, of, tap } from 'rxjs';
import {
  CatalogItem,
  CreateCatalogItemRequest,
  CustomerPlant,
  InspectionDraft,
  InspectionItem
} from '../models/simplyft.models';
import { MOCK_PLANTS } from './mock-data';

interface ApiPlant {
  id: string;
  customer: string;
  address?: string;
  code?: string;
  serial?: string;
  type?: string;
}

interface ApiCatalogItem {
  id: string | number;
  code?: string;
  shortDescription?: string;
  longDescription?: string;
  group?: string;
  branch?: string;
  standardLaborHours?: number;
  listMaterialPrice?: number;
}

@Injectable({ providedIn: 'root' })
export class InspectionService {
  private readonly storageKey = 'simplyft-inspection-drafts';
  private readonly catalogStorageKey = 'simplyft-catalog-items';

  private inspections = signal<InspectionDraft[]>(this.restoreInspections());
  readonly allInspections = computed(() => this.inspections());

  private localCatalog = signal<CatalogItem[]>(this.restoreCatalog());

  constructor(private http: HttpClient) {}

  searchCustomers(query: string): Observable<CustomerPlant[]> {
    const params = new HttpParams().set('query', query);
    return this.http.get<CustomerPlant[]>('/api/customers/search', { params }).pipe(
      catchError(() => this.http.get<ApiPlant[]>('/api/field/plants').pipe(map((plants) => plants.map(this.toCustomerPlant)))),
      catchError(() => of(this.filterCustomers(query)))
    );
  }

  getCustomer(id: string): Observable<CustomerPlant | undefined> {
    return this.http.get<CustomerPlant>(`/api/customers/${id}`).pipe(
      catchError(() => of(this.filterCustomers('').find((customer) => customer.id === id)))
    );
  }

  searchCatalogItems(query: string): Observable<CatalogItem[]> {
    const params = new HttpParams().set('query', query);
    return this.http.get<ApiCatalogItem[]>('/api/catalog/items', { params }).pipe(
      map((items) => items.map(this.toCatalogItem)),
      catchError(() => of(this.filterCatalog(query)))
    );
  }

  createCatalogItem(payload: CreateCatalogItemRequest): Observable<CatalogItem> {
    return this.http.post<CatalogItem>('/api/catalog/items', payload).pipe(
      catchError(() => {
        const item: CatalogItem = {
          id: `local-cat-${Date.now()}`,
          name: payload.name,
          categoryName: payload.category,
          shortDescription: payload.shortDescription
        };
        const next = [item, ...this.localCatalog()];
        this.localCatalog.set(next);
        localStorage.setItem(this.catalogStorageKey, JSON.stringify(next));
        return of(item);
      })
    );
  }

  getCategories(): Observable<string[]> {
    return this.http.get<string[]>('/api/catalog/categories').pipe(
      catchError(() => of([...new Set(this.localCatalog().map((item) => item.categoryName ?? 'Generale'))]))
    );
  }

  saveDraft(draft: InspectionDraft): Observable<InspectionDraft> {
    const nextDraft = this.prepareForSave({ ...draft, status: 'DRAFT' });
    return this.http.post<InspectionDraft>(`/api/inspections/${nextDraft.id}/save-draft`, nextDraft).pipe(
      catchError(() => of(nextDraft)),
      tap((saved) => this.upsert(saved))
    );
  }

  submit(draft: InspectionDraft): Observable<InspectionDraft> {
    const nextDraft = this.prepareForSave({ ...draft, status: 'SUBMITTED', submittedAt: new Date().toISOString() });
    return this.http.post<InspectionDraft>(`/api/inspections/${nextDraft.id}/submit`, nextDraft).pipe(
      catchError(() => of(nextDraft)),
      tap((saved) => this.upsert(saved))
    );
  }

  listForUser(technicianId: string, role: 'technician' | 'office'): InspectionDraft[] {
    return this.inspections().filter((inspection) => {
      if (inspection.status === 'SUBMITTED') {
        return true;
      }
      return role === 'technician' && inspection.technicianId === technicianId;
    });
  }

  formalizeDescription(item: InspectionItem): Observable<string> {
    const currentDescription = item.formalizedDescription?.trim() ?? '';
    const mode = currentDescription ? 'FORMALIZE' : 'GENERATE';
    const payload = {
      mode,
      objectName: item.catalogItemName,
      category: item.categoryName,
      laborHours: item.laborHours,
      materialCost: item.materialCost,
      currentDescription,
      freeTechnicalNote: item.rawNote?.trim() ?? '',
      transcribedVoiceNote: item.transcribedNote?.trim() ?? '',
      photoMetadata: item.photos.map((photo) => ({
        fileName: photo.fileName,
        contentType: photo.contentType
      })),
      prompt: mode === 'GENERATE'
        ? 'Genera una descrizione breve e professionale per un commerciale, usando solo i dati tecnici forniti. Non inventare informazioni mancanti. Massimo 2 frasi.'
        : 'Riscrivi il testo tecnico fornito in linguaggio chiaro, professionale e adatto a un commerciale o segretario. Mantieni il significato originale. Non aggiungere dettagli non presenti. Massimo 2 frasi.'
    };
    return this.http.post<{ text?: string; formalizedText?: string; description?: string }>('/api/ai/formalize-description', payload).pipe(
      map((response) => response.text ?? response.formalizedText ?? response.description ?? ''),
      catchError(() => of(this.buildFormalDescription(item, mode)))
    );
  }

  transcribeAudio(audio: Blob, fileName = 'nota-vocale.webm'): Observable<string> {
    const data = new FormData();
    data.append('audio', audio, fileName);
    return this.http.post<{ text?: string; transcription?: string }>('/api/audio/transcribe', data).pipe(
      map((response) => response.transcription ?? response.text ?? ''),
      catchError(() => of('Nota audio registrata. Verificare il componente e formalizzare l intervento richiesto.'))
    );
  }

  formalizeTranscription(text: string, item?: InspectionItem): Observable<string> {
    const payload = {
      transcription: text,
      context: item ? {
        objectName: item.catalogItemName,
        category: item.categoryName,
        laborHours: item.laborHours,
        materialCost: item.materialCost
      } : undefined
    };
    return this.http.post<{ text?: string; formalizedText?: string }>('/api/ai/formalize-transcription', payload).pipe(
      map((response) => response.formalizedText ?? response.text ?? ''),
      catchError(() => of(`Intervento da valutare: ${text.replace(/\s+/g, ' ').trim()}`))
    );
  }

  private upsert(draft: InspectionDraft): void {
    const current = this.inspections();
    const next = current.some((item) => item.id === draft.id)
      ? current.map((item) => item.id === draft.id ? draft : item)
      : [draft, ...current];
    this.inspections.set(next);
    localStorage.setItem(this.storageKey, JSON.stringify(next));
  }

  private prepareForSave(draft: InspectionDraft): InspectionDraft {
    const now = new Date().toISOString();
    const totalLaborHours = draft.items.reduce((sum, item) => sum + this.validNumber(item.laborHours), 0);
    const totalMaterialCost = draft.items.reduce((sum, item) => sum + this.validNumber(item.materialCost), 0);
    return {
      ...draft,
      id: draft.id ?? `insp-${Date.now()}`,
      totalLaborHours,
      totalMaterialCost,
      createdAt: draft.createdAt ?? now,
      updatedAt: now
    };
  }

  private validNumber(value: number): number {
    return Number.isFinite(value) ? value : 0;
  }

  private filterCustomers(query: string): CustomerPlant[] {
    const q = query.toLowerCase().trim();
    return MOCK_PLANTS.map((plant) => ({
      id: plant.id,
      customerName: plant.customer,
      plantCode: plant.code,
      serial: plant.serial,
      address: plant.address,
      type: plant.type
    })).filter((plant) => !q || [plant.customerName, plant.plantCode, plant.serial, plant.address].join(' ').toLowerCase().includes(q));
  }

  private filterCatalog(query: string): CatalogItem[] {
    const q = query.toLowerCase().trim();
    return this.localCatalog().filter((item) => !q || [item.name, item.categoryName, item.shortDescription].join(' ').toLowerCase().includes(q));
  }

  private restoreInspections(): InspectionDraft[] {
    const raw = localStorage.getItem(this.storageKey);
    return raw ? JSON.parse(raw) as InspectionDraft[] : [];
  }

  private restoreCatalog(): CatalogItem[] {
    const raw = localStorage.getItem(this.catalogStorageKey);
    if (raw) {
      return JSON.parse(raw) as CatalogItem[];
    }
    return [
      { id: 'cat-argano', name: 'Argano centrale', categoryName: 'Trazione e sollevamento', shortDescription: 'Gruppo argano principale', standardLaborHours: 2.5, listMaterialPrice: 850 },
      { id: 'cat-quadro', name: 'Quadro manovra', categoryName: 'Elettrico', shortDescription: 'Quadro di controllo impianto', standardLaborHours: 4, listMaterialPrice: 3200 },
      { id: 'cat-bottoniera', name: 'Bottoniera cabina', categoryName: 'Comandi', shortDescription: 'Pulsantiera interna cabina', standardLaborHours: 1.5, listMaterialPrice: 420 },
      { id: 'cat-porte', name: 'Operatore porte', categoryName: 'Porte', shortDescription: 'Sistema apertura porte automatiche', standardLaborHours: 3, listMaterialPrice: 1100 }
    ];
  }

  private toCustomerPlant = (plant: ApiPlant): CustomerPlant => ({
    id: plant.id,
    customerName: plant.customer,
    plantCode: plant.code,
    serial: plant.serial,
    address: plant.address,
    type: plant.type
  });

  private toCatalogItem = (item: ApiCatalogItem): CatalogItem => ({
    id: String(item.id),
    name: item.shortDescription || item.longDescription || item.code || `Oggetto ${item.id}`,
    categoryName: item.group || item.branch,
    shortDescription: item.longDescription,
    standardLaborHours: item.standardLaborHours,
    listMaterialPrice: item.listMaterialPrice
  });

  private buildFormalDescription(item: InspectionItem, mode: 'GENERATE' | 'FORMALIZE'): string {
    const objectName = item.catalogItemName || 'componente rilevato';
    const currentDescription = item.formalizedDescription?.trim();
    if (mode === 'FORMALIZE' && currentDescription) {
      return currentDescription.length < 60
        ? `Si segnala la necessita di intervento su ${currentDescription.toLowerCase()}.`
        : currentDescription;
    }
    const note = item.rawNote || item.transcribedNote;
    if (note?.trim()) {
      return `E' necessario valutare ${objectName}: ${note.trim()}`;
    }
    return `E' necessario verificare ${objectName} e predisporre l'offerta per materiali e manodopera indicati.`;
  }
}
