import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { QuoteMockService } from '../../../core/services/quote-mock.service';
import { SurveyMockService } from '../../../core/services/survey-mock.service';
import { DataTableComponent } from '../../../shared/components/data-table/data-table.component';
import { KpiCardComponent } from '../../../shared/components/kpi-card/kpi-card.component';

@Component({
  selector: 'app-office-dashboard',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, RouterLink, KpiCardComponent, DataTableComponent],
  template: `
    <section class="office-page">
      <div class="handoff-confirm" *ngIf="surveys.justSent()">Nuovo rilievo ricevuto dal campo: scheda strutturata pronta per preventivo.</div>
      <div class="kpi-grid">
        <app-kpi-card label="Preventivi aperti" value="18" trend="+12%" trendTone="up" />
        <app-kpi-card label="Rilievi ricevuti" value="7 oggi" trend="3 nuovi" trendTone="up" />
        <app-kpi-card label="In attesa" value="5" trend="2 warning" trendTone="warn" />
        <app-kpi-card label="Valore pipeline" value="EUR 143k" trend="+8.4%" trendTone="up" />
      </div>
      <div class="dashboard-grid">
        <section class="card wide-card">
          <div class="section-head"><h2>Nuovi rilievi dal campo</h2><a routerLink="/office/preventivi">Apri preventivi</a></div>
          <app-data-table [columns]="['Cliente','Impianto','Affidabilita','Stato']" [rows]="surveyRows" />
        </section>
        <section class="card">
          <h2>Priorita di oggi</h2>
          <p class="priority" *ngFor="let quote of quotes.quotes()"><b>{{ quote.customer }}</b><span>{{ quote.estimatedValue | currency:'EUR':'symbol':'1.0-0' }}</span></p>
        </section>
        <section class="card">
          <h2>Anomalie da verificare</h2>
          <p class="warning-line">Foto targhetta motore mancante</p>
          <p class="warning-line">Portata montacarichi incoerente</p>
          <p class="warning-line">Listino fornitore non aggiornato</p>
        </section>
        <section class="card wide-card">
          <h2>Andamento opportunita</h2>
          <div class="area-chart"><span style="height: 35%"></span><span style="height: 58%"></span><span style="height: 42%"></span><span style="height: 72%"></span><span style="height: 64%"></span><span style="height: 88%"></span></div>
        </section>
      </div>
    </section>
  `
})
export class OfficeDashboardComponent {
  surveyRows = [
    { Cliente: 'Condominio Aurora', Impianto: 'BG-AUR-02', Affidabilita: '87%', Stato: 'Da verificare' },
    { Cliente: 'Officine Riva', Impianto: 'BS-RIV-12', Affidabilita: '68%', Stato: 'Warning' },
    { Cliente: 'Hotel San Marco', Impianto: 'VR-HSM-01', Affidabilita: '54%', Stato: 'Incompleto' }
  ];
  constructor(public quotes: QuoteMockService, public surveys: SurveyMockService) {}
}
