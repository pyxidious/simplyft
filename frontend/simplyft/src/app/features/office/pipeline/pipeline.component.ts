import { Component } from '@angular/core';
import { KanbanBoardComponent } from '../../../shared/components/kanban-board/kanban-board.component';
import { PipelineMockService } from '../../../core/services/pipeline-mock.service';

@Component({
  selector: 'app-pipeline',
  standalone: true,
  imports: [KanbanBoardComponent],
  templateUrl: './pipeline.component.html',
  styleUrl: './pipeline.component.css'
})
export class PipelineComponent {
  constructor(public pipeline: PipelineMockService) {}
}
