import { Component, OnInit } from '@angular/core';
import { KanbanBoardComponent } from '../../../shared/components/kanban-board/kanban-board.component';
import { PipelineCommercialeService } from '../../../core/services/pipeline-commerciale.service';

@Component({
  selector: 'app-pipeline',
  standalone: true,
  imports: [KanbanBoardComponent],
  templateUrl: './pipeline.component.html',
  styleUrl: './pipeline.component.css'
})
export class PipelineComponent implements OnInit {
  constructor(public pipeline: PipelineCommercialeService) {}

  ngOnInit(): void {
    this.pipeline.load();
  }
}
