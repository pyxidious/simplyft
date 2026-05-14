import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-checklist',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="checklist">
      <label *ngFor="let item of items" class="check-row">
        <input type="checkbox" [checked]="item.done" />
        <span>{{ item.label }}</span>
      </label>
    </div>
  `
})
export class ChecklistComponent {
  @Input() items: { label: string; done: boolean }[] = [];
}
