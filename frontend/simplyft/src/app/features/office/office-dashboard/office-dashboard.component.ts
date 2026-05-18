import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommercialDashboard, CommercialDashboardInspection } from '../../../core/models/simplyft.models';
import { CommercialDashboardService } from '../../../core/services/commercial-dashboard.service';
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
  constructor(public dashboardService: CommercialDashboardService) {}

  ngOnInit(): void {
    this.dashboardService.load();
  }

  dashboard(): CommercialDashboard | undefined {
    return this.dashboardService.dashboard();
  }

  surveyRows(dashboard: CommercialDashboard): Record<string, string>[] {
    return dashboard.recentInspections.map((inspection) => this.toSurveyRow(inspection));
  }

  maxTrendValue(): number {
    const values = this.dashboard()?.opportunityTrend.map((point) => Number(point.value)) ?? [];
    return Math.max(...values, 0);
  }

  trendHeight(value: number): string {
    const max = this.maxTrendValue();
    return max <= 0 ? '0%' : `${Math.max(8, Math.round((Number(value) / max) * 100))}%`;
  }

  private toSurveyRow(inspection: CommercialDashboardInspection): Record<string, string> {
    return {
      Cliente: inspection.customerName,
      Impianto: inspection.plantCode || '-',
      Tecnico: inspection.technicianName,
      Stato: inspection.status === 'DRAFT' ? 'Bozza' : 'Da verificare'
    };
  }
}
