import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  styleUrl: './status-badge.component.css',
  template: `<span class="status-badge" [class]="tone">{{ label }}</span>`
})
export class StatusBadgeComponent {
  @Input({ required: true }) label = '';
  @Input() tone: 'success' | 'warning' | 'danger' | 'info' | 'neutral' = 'neutral';
}
