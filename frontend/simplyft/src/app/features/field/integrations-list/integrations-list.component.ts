import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IntegrazioniTecnicoService } from '../../../core/services/integrazioni-tecnico.service';

@Component({
  selector: 'app-integrations-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './integrations-list.component.html',
  styleUrl: './integrations-list.component.css'
})
export class IntegrationsListComponent implements OnInit {
  constructor(public integrations: IntegrazioniTecnicoService) {}

  ngOnInit(): void {
    this.integrations.load();
  }
}
