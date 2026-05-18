import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Plant } from '../../../core/models/simplyft.models';
import { TechnicianPlantsService } from '../../../core/services/technician-plants.service';
import { FormFieldComponent } from '../../../shared/components/form-field/form-field.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';

@Component({
  selector: 'app-plant-detail',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, FormFieldComponent, StatusBadgeComponent],
  templateUrl: './plant-detail.component.html',
  styleUrl: './plant-detail.component.css'
})
export class PlantDetailComponent {
  plantValue: Plant | undefined;
  plant = () => this.plantValue;
  form: ReturnType<FormBuilder['group']>;
  recording = signal(false);
  uploading = signal(false);

  constructor(private route: ActivatedRoute, private plants: TechnicianPlantsService, private fb: FormBuilder) {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    const plant = this.plants.getById(id);
    this.plantValue = plant;
    this.form = this.fb.group({
      customer: [plant?.customer ?? ''],
      address: [plant?.address ?? ''],
      code: [plant?.code ?? ''],
      serial: [plant?.serial ?? ''],
      type: [plant?.type ?? ''],
      brand: [plant?.brand ?? ''],
      model: [plant?.model ?? ''],
      estimatedYear: [plant?.estimatedYear ?? 2020],
      notes: [plant?.notes ?? '']
    });
    if (!plant) {
      this.plants.getById$(id).subscribe((loaded) => {
        this.plantValue = { ...loaded, attachments: loaded.attachments ?? [] };
        this.form.patchValue(this.plantValue);
      });
    }
  }
}
