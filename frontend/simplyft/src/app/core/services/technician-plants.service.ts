import { HttpClient } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { Plant, PlantStatus } from '../models/simplyft.models';

@Injectable({ providedIn: 'root' })
export class TechnicianPlantsService {
  plants = signal<Plant[]>([]);
  loading = signal(false);
  error = signal('');

  constructor(private http: HttpClient) {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.http.get<Plant[]>('/api/tecnico/impianti').subscribe({
      next: (plants) => {
        this.plants.set(plants.map((plant) => ({ ...plant, attachments: plant.attachments ?? [] })));
        this.loading.set(false);
      },
      error: () => {
        this.plants.set([]);
        this.error.set('Impossibile caricare gli impianti assegnati.');
        this.loading.set(false);
      }
    });
  }

  getById(id: string): Plant | undefined {
    const cached = this.plants().find((plant) => plant.id === id);
    if (!cached) {
      this.getById$(id).subscribe();
    }
    return cached;
  }

  getById$(id: string): Observable<Plant> {
    return this.http.get<Plant>(`/api/tecnico/impianti/${id}`).pipe(
      tap((plant) => this.plants.update((items) => items.some((item) => item.id === plant.id)
        ? items.map((item) => item.id === plant.id ? { ...plant, attachments: plant.attachments ?? [] } : item)
        : [{ ...plant, attachments: plant.attachments ?? [] }, ...items]))
    );
  }

  search(query: string, status: PlantStatus | 'all'): Plant[] {
    const q = query.toLowerCase().trim();
    return this.plants().filter((plant) => {
      const matchesStatus = status === 'all' || plant.status === status;
      const matchesText = !q || [
        plant.customer,
        plant.address,
        plant.code,
        plant.brand,
        plant.assignedTo,
        plant.assignmentCode,
        plant.assignmentTitle
      ].join(' ').toLowerCase().includes(q);
      return matchesStatus && matchesText;
    });
  }
}
