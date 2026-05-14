import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { SurveyStep } from '../../../core/models/simplyft.models';

@Component({
  selector: 'app-stepper',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="stepper">
      <button *ngFor="let step of steps; let index = index" class="step" [class.active]="index === activeIndex" [class.done]="step.complete">
        <span>{{ index + 1 }}</span>
        <b>{{ step.title }}</b>
      </button>
    </div>
  `
})
export class StepperComponent {
  @Input() steps: SurveyStep[] = [];
  @Input() activeIndex = 0;
}
