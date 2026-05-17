import { HttpClient } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { catchError, of, tap } from 'rxjs';

export interface FieldHomeActivity {
  code: string;
  title: string;
  location: string;
  type: 'maintenance' | 'safety' | string;
  priority: string;
  dueDate: string;
}

export interface FieldHomeData {
  technician: {
    name: string;
    online: boolean;
  };
  stats: {
    assigned: number;
    pendingSync: number;
    catalogItems: number;
  };
  assignedActivities: FieldHomeActivity[];
  notification: {
    title: string;
    message: string;
    type: string;
  };
}

const FALLBACK_HOME: FieldHomeData = {
  technician: { name: 'Marcus V.', online: true },
  stats: { assigned: 2, pendingSync: 0, catalogItems: 4 },
  assignedActivities: [
    {
      code: 'ELV-4029-A',
      title: 'Manutenzione sollevatori principale',
      location: 'Piazza Centro • Torre B',
      type: 'maintenance',
      priority: 'Alta',
      dueDate: '2026-05-18'
    },
    {
      code: 'SRV-1022-C',
      title: 'Ispezione di sicurezza',
      location: 'Parco Industriale Ovest',
      type: 'safety',
      priority: 'Media',
      dueDate: '2026-05-19'
    }
  ],
  notification: {
    title: 'Nuovi ricambi disponibili per il ritiro',
    message: 'L ordine #9921 per ELV-4029 e stato elaborato presso Magazzino Nord.',
    type: 'parts'
  }
};

@Injectable({ providedIn: 'root' })
export class FieldHomeService {
  home = signal<FieldHomeData>(FALLBACK_HOME);
  loading = signal(false);

  constructor(private http: HttpClient) {}

  load(): void {
    this.loading.set(true);
    this.http.get<FieldHomeData>('/api/field/home').pipe(
      tap((home) => this.home.set(home)),
      catchError(() => of(FALLBACK_HOME)),
      tap(() => this.loading.set(false))
    ).subscribe((home) => this.home.set(home));
  }
}
