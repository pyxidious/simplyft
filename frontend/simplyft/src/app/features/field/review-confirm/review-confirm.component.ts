import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SurveyMockService } from '../../../core/services/survey-mock.service';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';

@Component({
  selector: 'app-review-confirm',
  standalone: true,
  imports: [CommonModule, RouterLink, StatusBadgeComponent],
  templateUrl: './review-confirm.component.html',
  styleUrl: './review-confirm.component.css'
})
export class ReviewConfirmComponent {
  constructor(public survey: SurveyMockService) {}
}
