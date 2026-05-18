import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FieldHomeActivity, FieldHomeService } from '../../../core/services/field-home.service';
import { IntegrazioniTecnicoService } from '../../../core/services/integrazioni-tecnico.service';

@Component({
  selector: 'app-field-home',
  imports: [CommonModule, RouterLink],
  templateUrl: './field-home.component.html',
  styleUrl: './field-home.component.css'
})
export class FieldHomeComponent implements OnInit {
  constructor(
    public home: FieldHomeService,
    public integrations: IntegrazioniTecnicoService
  ) {}

  ngOnInit(): void {
    this.home.load();
    this.integrations.load();
  }

  iconFor(activity: FieldHomeActivity): string {
    return activity.type === 'safety' ? '▣' : '♙';
  }
}
