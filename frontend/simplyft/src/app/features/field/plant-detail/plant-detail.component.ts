import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Plant } from '../../../core/models/simplyft.models';
import { PlantMockService } from '../../../core/services/plant-mock.service';
import { FormFieldComponent } from '../../../shared/components/form-field/form-field.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { UploadMockComponent } from '../../../shared/components/upload-mock/upload-mock.component';
import { VoiceNoteMockComponent } from '../../../shared/components/voice-note-mock/voice-note-mock.component';

@Component({
  selector: 'app-plant-detail',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, FormFieldComponent, StatusBadgeComponent, UploadMockComponent, VoiceNoteMockComponent],
  template: `
    <section class="field-screen" *ngIf="plant() as item">
      <a class="back-link" routerLink="/field/impianti">&lt; Impianti</a>
      <header class="page-title">
        <div>
          <p class="muted">Dati impianto</p>
          <h1>{{ item.customer }}</h1>
        </div>
        <app-status-badge [label]="item.completeness + '% completo'" [tone]="item.completeness > 80 ? 'success' : 'warning'" />
      </header>

      <form class="form-grid" [formGroup]="form">
        <app-form-field label="Cliente"><input formControlName="customer" /></app-form-field>
        <app-form-field label="Indirizzo"><input formControlName="address" /></app-form-field>
        <app-form-field label="Codice impianto"><input formControlName="code" /></app-form-field>
        <app-form-field label="Matricola"><input formControlName="serial" /></app-form-field>
        <app-form-field label="Tipologia impianto"><input formControlName="type" /></app-form-field>
        <app-form-field label="Marca"><input formControlName="brand" /></app-form-field>
        <app-form-field label="Modello"><input formControlName="model" /></app-form-field>
        <app-form-field label="Anno stimato"><input type="number" formControlName="estimatedYear" /></app-form-field>
        <app-form-field label="Note libere"><textarea formControlName="notes"></textarea></app-form-field>
        <app-form-field label="Annotazione libera"><textarea placeholder="Scrivi senza schema: SimpLyft la normalizzera nel riepilogo"></textarea></app-form-field>
      </form>

      <app-voice-note-mock />
      <app-upload-mock [attachments]="item.attachments" />
      <a class="btn primary wide" routerLink="/field/nuovo-rilievo">Avvia rilievo guidato</a>
    </section>
  `
})
export class PlantDetailComponent {
  plantValue: Plant | undefined;
  plant = () => this.plantValue;
  form: ReturnType<FormBuilder['group']>;

  constructor(private route: ActivatedRoute, private plants: PlantMockService, private fb: FormBuilder) {
    const id = this.route.snapshot.paramMap.get('id') ?? 'p-101';
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
  }
}
