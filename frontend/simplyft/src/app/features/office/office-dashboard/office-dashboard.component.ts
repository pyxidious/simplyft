import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { InspectionDraft } from '../../../core/models/simplyft.models';
import { InspectionService } from '../../../core/services/inspection.service';
import { QuoteMockService } from '../../../core/services/quote-mock.service';
import { SurveyMockService } from '../../../core/services/survey-mock.service';
import { DataTableComponent } from '../../../shared/components/data-table/data-table.component';
import { KpiCardComponent } from '../../../shared/components/kpi-card/kpi-card.component';

@Component({
  selector: 'app-office-dashboard',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, RouterLink, KpiCardComponent, DataTableComponent],
  templateUrl: './office-dashboard.component.html',
  styleUrl: './office-dashboard.component.css'
})
export class OfficeDashboardComponent implements OnInit {
  surveyRows = signal<Record<string, string>[]>([]);

  constructor(
    public quotes: QuoteMockService,
    public surveys: SurveyMockService,
    private inspections: InspectionService
  ) {}

  ngOnInit(): void {
    this.inspections.listForCommercialReview().subscribe({
      next: (inspections) => this.surveyRows.set(inspections.map((inspection) => this.toSurveyRow(inspection))),
      error: () => this.surveyRows.set([])
    });
  }

  private toSurveyRow(inspection: InspectionDraft): Record<string, string> {
    return {
      Cliente: inspection.customerName,
      Impianto: inspection.plantCode ?? '-',
      Tecnico: inspection.technicianName,
      Stato: inspection.status === 'DRAFT' ? 'Bozza' : 'Da verificare'
    };
  }
}
