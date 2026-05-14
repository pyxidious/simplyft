import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-form-field',
  standalone: true,
  template: `
    <label class="field">
      <span>{{ label }}</span>
      <ng-content></ng-content>
    </label>
  `
})
export class FormFieldComponent {
  @Input() label = '';
}
