import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, computed, signal } from '@angular/core';
import { Observable, catchError, map, of, tap, throwError } from 'rxjs';
import {
  CatalogItem,
  CreateCatalogItemRequest,
  CustomerPlant,
  InspectionDraft,
  InspectionItem
} from '../models/simplyft.models';

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
  private inspections = signal<InspectionDraft[]>([]);
  readonly allInspections = computed(() => this.inspections());

  constructor(private http: HttpClient) {
    this.loadInspections();
  }

  loadInspections(): void {
    this.http.get<InspectionDraft[]>('/api/inspections').pipe(
      catchError(() => of([]))
    ).subscribe((items) => this.inspections.set(items));
  }

  searchCustomers(query: string): Observable<CustomerPlant[]> {
    const params = new HttpParams().set('query', query);
    return this.http.get<CustomerPlant[]>('/api/customers/search', { params }).pipe(
      map((plants) => plants.map((plant: CustomerPlant | ApiPlant) => 'customerName' in plant ? plant : this.toCustomerPlant(plant))),
      catchError(() => of([]))
    );
  }

  getCustomer(id: string): Observable<CustomerPlant | undefined> {
    return this.http.get<CustomerPlant>(`/api/customers/${id}`).pipe(
      catchError(() => of(undefined))
    );
  }

  searchCatalogItems(query: string): Observable<CatalogItem[]> {
    const params = new HttpParams().set('query', query);
    return this.http.get<ApiCatalogItem[]>('/api/catalog/items', { params }).pipe(
      map((items) => items.map(this.toCatalogItem)),
      catchError(() => of([]))
    );
  }

  createCatalogItem(payload: CreateCatalogItemRequest): Observable<CatalogItem> {
    return this.http.post<ApiCatalogItem>('/api/catalog/items', payload).pipe(map(this.toCatalogItem));
  }

  getCategories(): Observable<string[]> {
    return this.http.get<string[]>('/api/catalog/categories').pipe(
      catchError(() => of([]))
    );
  }

  saveDraft(draft: InspectionDraft): Observable<InspectionDraft> {
    const nextDraft = this.prepareForSave({ ...draft, status: 'DRAFT' });
    return this.http.post<InspectionDraft>('/api/inspections/save-draft', nextDraft).pipe(
      tap((saved) => this.upsert(saved))
    );
  }

  submit(draft: InspectionDraft): Observable<InspectionDraft> {
    const nextDraft = this.prepareForSave({ ...draft, status: 'SUBMITTED', submittedAt: new Date().toISOString() });
    return this.http.post<InspectionDraft>('/api/inspections/submit', nextDraft).pipe(
      tap((saved) => this.upsert(saved))
    );
  }

  listForUser(technicianId: string, role: 'tecnico' | 'commerciale' | 'amministratore'): InspectionDraft[] {
    return this.inspections().filter((inspection) => {
      if (inspection.status === 'SUBMITTED') {
        return true;
      }
      return role === 'tecnico' && inspection.technicianId === technicianId;
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
      map((text) => {
        if (!text.trim()) {
          throw new Error('Trascrizione vuota');
        }
        return text;
      }),
      catchError((error) => throwError(() => error))
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
