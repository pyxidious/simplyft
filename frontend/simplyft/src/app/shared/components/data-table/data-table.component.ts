import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [CommonModule],
  styleUrl: './data-table.component.css',
  template: `
    <div class="table-wrap">
      <table>
        <thead>
          <tr><th *ngFor="let column of columns">{{ column }}</th></tr>
        </thead>
        <tbody>
          <tr *ngFor="let row of rows">
            <td *ngFor="let column of columns">{{ row[column] }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  `
})
export class DataTableComponent {
  @Input() columns: string[] = [];
  @Input() rows: Record<string, string | number>[] = [];
}
