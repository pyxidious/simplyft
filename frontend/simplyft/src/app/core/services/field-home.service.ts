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

const EMPTY_HOME: FieldHomeData = {
  technician: { name: 'Tecnico', online: false },
  stats: { assigned: 0, pendingSync: 0, catalogItems: 0 },
  assignedActivities: [],
  notification: {
    title: 'Backend non raggiungibile',
    message: 'Controlla connessione e sessione, poi riprova.',
    type: 'warning'
  }
};

@Injectable({ providedIn: 'root' })
export class FieldHomeService {
  home = signal<FieldHomeData>(EMPTY_HOME);
  loading = signal(false);

  constructor(private http: HttpClient) {}

  load(): void {
    this.loading.set(true);
    this.http.get<FieldHomeData>('/api/tecnico/home').pipe(
      tap((home) => this.home.set(home)),
      catchError(() => of(EMPTY_HOME)),
      tap(() => this.loading.set(false))
    ).subscribe((home) => this.home.set(home));
  }
}
