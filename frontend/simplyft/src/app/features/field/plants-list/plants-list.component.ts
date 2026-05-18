import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PlantStatus } from '../../../core/models/simplyft.models';
import { PlantMockService } from '../../../core/services/plant-mock.service';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';

@Component({
  selector: 'app-plants-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, StatusBadgeComponent],
  templateUrl: './plants-list.component.html',
  styleUrl: './plants-list.component.css'
})
export class PlantsListComponent {
  query = signal('');
  status = signal<PlantStatus | 'all'>('all');
  constructor(public plants: PlantMockService) {}
  label(status: PlantStatus): string { return status === 'complete' ? 'Completo' : status === 'incomplete' ? 'Incompleto' : 'Richiede verifica'; }
  tone(status: PlantStatus): 'success' | 'warning' | 'danger' { return status === 'complete' ? 'success' : status === 'incomplete' ? 'warning' : 'danger'; }
}
