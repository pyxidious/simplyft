import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { InspectionService } from '../../../core/services/inspection.service';
import { InspectionDraft } from '../../../core/models/simplyft.models';

@Component({
  selector: 'app-inspections-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './inspections-list.component.html',
  styleUrl: './inspections-list.component.css'
})
export class InspectionsListComponent {
  pendingDelete = signal<InspectionDraft | undefined>(undefined);
  deletingId = signal('');
  successFeedback = signal('');

  visibleInspections = computed(() => {
    const user = this.auth.currentUser();
    return this.inspections.listForUser(user?.id ?? '', user?.role ?? 'tecnico');
  });

  constructor(private router: Router, private auth: AuthService, public inspections: InspectionService) {
    const feedback = this.router.getCurrentNavigation()?.extras.state?.['feedback'];
    if (typeof feedback === 'string') {
      this.successFeedback.set(feedback);
    }
  }

  openInspection(inspection: InspectionDraft): void {
    if (inspection.status === 'DRAFT') {
      this.router.navigate(['/tecnico/rilievi/bozze', inspection.id]);
      return;
    }
    this.router.navigate(['/tecnico/rilievi', inspection.id]);
  }

  requestDelete(inspection: InspectionDraft): void {
    this.pendingDelete.set(inspection);
  }

  closeDeleteModal(): void {
    if (!this.deletingId()) {
      this.pendingDelete.set(undefined);
    }
  }

  confirmDelete(): void {
    const draft = this.pendingDelete();
    if (!draft?.id || this.deletingId()) {
      return;
    }
    this.deletingId.set(draft.id);
    this.inspections.deleteDraft(draft.id).subscribe({
      next: () => {
        this.deletingId.set('');
        this.pendingDelete.set(undefined);
        this.inspections.loadInspections();
      },
      error: () => {
        this.deletingId.set('');
        this.inspections.error.set('Non e stato possibile eliminare la bozza.');
      }
    });
  }
}
