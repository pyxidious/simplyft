import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, computed, signal } from '@angular/core';
import { Observable, catchError, forkJoin, map, of, tap, throwError } from 'rxjs';
import {
  CatalogItem,
  CreateCatalogItemRequest,
  CustomerPlant,
  InspectionDraft,
  InspectionItem
} from '../models/simplyft.models';
import { AuthService } from './auth.service';

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
  readonly loading = signal(false);
  readonly error = signal('');

  constructor(private http: HttpClient, private auth: AuthService) {
    if (this.auth.currentUser()?.role === 'tecnico') {
      this.loadInspections();
    }
  }

  loadInspections(): void {
    this.loading.set(true);
    this.error.set('');
    forkJoin({
      drafts: this.http.get<InspectionDraft[]>('/api/tecnico/rilievi/bozze'),
      submitted: this.http.get<InspectionDraft[]>('/api/tecnico/rilievi')
    }).pipe(
      map(({ drafts, submitted }) => [...drafts, ...submitted]),
      catchError((error) => {
        this.error.set(this.messageForStatus(error.status));
        return of([]);
      })
    ).subscribe((items) => {
      this.inspections.set(items);
      this.loading.set(false);
    });
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
    const status = draft.status === 'NEEDS_INTEGRATION' || draft.status === 'IN_PROGRESS' ? 'IN_PROGRESS' : 'DRAFT';
    const nextDraft = this.prepareForSave({ ...draft, status });
    const request = status === 'IN_PROGRESS'
      ? this.http.patch<InspectionDraft>(`/api/tecnico/rilievi/${nextDraft.id}`, nextDraft)
      : this.isPersistedInspection(nextDraft)
        ? this.http.put<InspectionDraft>(`/api/tecnico/rilievi/bozze/${nextDraft.id}`, nextDraft)
        : this.http.post<InspectionDraft>('/api/tecnico/rilievi/bozze', nextDraft);
    return request.pipe(
      tap((saved) => this.upsert(saved))
    );
  }

  submit(draft: InspectionDraft): Observable<InspectionDraft> {
    const nextDraft = this.prepareForSave({ ...draft, status: 'SUBMITTED', submittedAt: new Date().toISOString() });
    const request = this.isPersistedInspection(nextDraft)
      ? this.submitPersisted(nextDraft)
      : this.http.post<InspectionDraft>('/api/tecnico/rilievi', nextDraft);
    return request.pipe(
      tap((saved) => this.upsert(saved))
    );
  }

  listForCommercialReview(): Observable<InspectionDraft[]> {
    return this.http.get<InspectionDraft[]>('/api/inspections').pipe(
      map((inspections) => inspections.filter((inspection) => inspection.status !== 'DRAFT'))
    );
  }

  listForUser(technicianId: string, role: 'tecnico' | 'commerciale' | 'amministratore'): InspectionDraft[] {
    if (role !== 'tecnico' || !technicianId) {
      return [];
    }
    return this.inspections().filter((inspection) => inspection.status !== 'DRAFT' || inspection.technicianId === technicianId);
  }

  getDraft(id: string): Observable<InspectionDraft> {
    return this.http.get<InspectionDraft>(`/api/tecnico/rilievi/bozze/${id}`).pipe(
      tap((saved) => this.upsert(saved))
    );
  }

  getInspection(id: string): Observable<InspectionDraft> {
    return this.http.get<InspectionDraft>(`/api/tecnico/rilievi/${id}`).pipe(
      tap((saved) => this.upsert(saved))
    );
  }

  deleteDraft(id: string): Observable<void> {
    return this.http.delete<void>(`/api/tecnico/rilievi/bozze/${id}`).pipe(
      tap(() => this.inspections.update((items) => items.filter((item) => item.id !== id)))
    );
  }

  formalizeDescription(item: InspectionItem): Observable<string> {
    const originalTechnicalDescription = this.sourceTechnicalDescription(item);
    const currentDescription = this.currentFormalizedDescription(item);
    const mode = currentDescription ? 'FORMALIZE' : 'GENERATE';
    const payload = {
      mode,
      objectName: item.catalogItemName,
      category: item.categoryName,
      laborHours: item.laborHours,
      materialCost: item.materialCost,
      originalTechnicalDescription,
      currentDescription,
      freeTechnicalNote: item.rawNote?.trim() ?? '',
      transcribedVoiceNote: item.transcribedNote?.trim() ?? '',
      photoMetadata: item.photos.map((photo) => ({
        fileName: photo.fileName,
        contentType: photo.contentType
      })),
      prompt: mode === 'GENERATE'
        ? 'Genera una descrizione breve e professionale per un commerciale, usando solo i dati tecnici forniti. Non inventare informazioni mancanti. Massimo 2 frasi.'
        : 'Riscrivi il testo seguente in linguaggio chiaro, professionale e adatto a commerciale/segreteria. Mantieni il significato. Non aggiungere dettagli. Max 2 frasi. Non ripetere titoli o prefissi.'
    };
    return this.http.post<{ text?: string; formalizedText?: string; description?: string }>('/api/ai/formalize-description', payload).pipe(
      map((response) => response.formalizedText ?? response.text ?? response.description ?? ''),
      map((text) => this.normalizeFormalizedPrefix(text, item.catalogItemName)),
      catchError((error) => throwError(() => error))
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
      totalLaborHours,
      totalMaterialCost,
      createdAt: draft.createdAt ?? now,
      updatedAt: now
    };
  }

  private submitPersisted(draft: InspectionDraft): Observable<InspectionDraft> {
    return this.http.post<InspectionDraft>(`/api/tecnico/rilievi/${draft.id}/submit`, draft);
  }

  private isPersistedInspection(draft: InspectionDraft): boolean {
    return Boolean(draft.id?.startsWith('insp-'));
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

  private sourceTechnicalDescription(item: InspectionItem): string {
    return (item.originalTechnicalDescription ?? '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private currentFormalizedDescription(item: InspectionItem): string {
    return (item.formalizedDescription ?? '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private normalizeFormalizedPrefix(text: string, objectName: string): string {
    const cleaned = text.replace(/\s+/g, ' ').trim();
    const normalizedObject = objectName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const repeatedPrefix = new RegExp(`^(?:Intervento\\s+su\\s+${normalizedObject}:\\s*)+`, 'i');
    const match = cleaned.match(repeatedPrefix);
    if (!match) {
      return cleaned;
    }
    const withoutPrefixes = cleaned.slice(match[0].length).trim();
    return withoutPrefixes ? `Intervento su ${objectName}: ${withoutPrefixes}` : `Intervento su ${objectName}:`;
  }

  private buildFormalDescription(item: InspectionItem, mode: 'GENERATE' | 'FORMALIZE'): string {
    const objectName = item.catalogItemName || 'componente rilevato';
    const currentDescription = this.currentFormalizedDescription(item);
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

  private messageForStatus(status: number): string {
    if (status === 401) {
      return "Sessione scaduta. Effettua nuovamente l'accesso.";
    }
    if (status === 403) {
      return 'Non hai i permessi per visualizzare questi rilievi.';
    }
    return 'Impossibile caricare i rilievi. Riprova tra poco.';
  }
}
