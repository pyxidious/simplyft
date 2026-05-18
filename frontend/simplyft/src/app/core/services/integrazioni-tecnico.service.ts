import { HttpClient } from '@angular/common/http';
import { Injectable, computed, signal } from '@angular/core';
import { catchError, finalize, of } from 'rxjs';
import { IntegrationRequest } from '../models/simplyft.models';

@Injectable({ providedIn: 'root' })
export class IntegrazioniTecnicoService {
  private readonly requestsState = signal<IntegrationRequest[]>([]);
  readonly requests = computed(() => this.requestsState());
  readonly openRequests = computed(() => this.requestsState().filter((request) => request.status === 'OPEN'));
  readonly loading = signal(false);
  readonly error = signal('');

  constructor(private http: HttpClient) {}

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.http.get<IntegrationRequest[]>('/api/tecnico/integrazioni').pipe(
      catchError(() => {
        this.error.set('Impossibile caricare le richieste integrazione.');
        return of([]);
      }),
      finalize(() => this.loading.set(false))
    ).subscribe((requests) => this.requestsState.set(requests));
  }
}
