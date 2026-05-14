import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { ActivityLog } from '../../../core/models/simplyft.models';

@Component({
  selector: 'app-activity-timeline',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="timeline">
      <article *ngFor="let item of items" class="timeline-item" [class]="item.tone">
        <span></span>
        <div>
          <b>{{ item.actor }}</b>
          <p>{{ item.action }}</p>
          <small>{{ item.date }}</small>
        </div>
      </article>
    </div>
  `
})
export class ActivityTimelineComponent {
  @Input() items: ActivityLog[] = [];
}
