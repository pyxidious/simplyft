import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SurveyMockService } from '../../../core/services/survey-mock.service';
import { FieldHomeActivity, FieldHomeService } from '../../../core/services/field-home.service';

@Component({
  selector: 'app-field-home',
  imports: [CommonModule, RouterLink],
  templateUrl: './field-home.component.html',
  styleUrl: './field-home.component.css'
})
export class FieldHomeComponent implements OnInit {
  constructor(public home: FieldHomeService, public surveys: SurveyMockService) {}

  ngOnInit(): void {
    this.home.load();
  }

  iconFor(activity: FieldHomeActivity): string {
    return activity.type === 'safety' ? '▣' : '♙';
  }
}
