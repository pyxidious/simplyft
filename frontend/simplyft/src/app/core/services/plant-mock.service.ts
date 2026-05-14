import { Injectable, signal } from '@angular/core';
import { Plant, PlantStatus } from '../models/simplyft.models';
import { MOCK_PLANTS } from './mock-data';

@Injectable({ providedIn: 'root' })
export class PlantMockService {
  plants = signal<Plant[]>(this.restore());

  getById(id: string): Plant | undefined {
    return this.plants().find((plant) => plant.id === id);
  }

  search(query: string, status: PlantStatus | 'all'): Plant[] {
    const q = query.toLowerCase().trim();
    return this.plants().filter((plant) => {
      const matchesStatus = status === 'all' || plant.status === status;
      const matchesText = !q || [plant.customer, plant.address, plant.code, plant.brand].join(' ').toLowerCase().includes(q);
      return matchesStatus && matchesText;
    });
  }

  update(plant: Plant): void {
    const next = this.plants().map((item) => item.id === plant.id ? plant : item);
    this.plants.set(next);
    localStorage.setItem('simplyft-plants', JSON.stringify(next));
  }

  private restore(): Plant[] {
    const raw = localStorage.getItem('simplyft-plants');
    return raw ? JSON.parse(raw) as Plant[] : MOCK_PLANTS;
  }
}
