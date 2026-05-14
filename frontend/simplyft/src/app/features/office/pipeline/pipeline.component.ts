import { Component } from '@angular/core';
import { KanbanBoardComponent } from '../../../shared/components/kanban-board/kanban-board.component';
import { PipelineMockService } from '../../../core/services/pipeline-mock.service';

@Component({
  selector: 'app-pipeline',
  standalone: true,
  imports: [KanbanBoardComponent],
  template: `
    <section class="office-page">
      <div class="section-head"><h2>Pipeline preventivi</h2><span class="muted">Kanban commerciale aggiornato dai rilievi campo</span></div>
      <app-kanban-board [columns]="pipeline.grouped()" />
    </section>
  `
})
export class PipelineComponent {
  constructor(public pipeline: PipelineMockService) {}
}
