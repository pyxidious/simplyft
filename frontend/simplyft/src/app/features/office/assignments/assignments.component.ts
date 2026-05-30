import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommercialAssignment } from '../../../core/models/simplyft.models';
import { AssegnazioniCommercialeService } from '../../../core/services/assegnazioni-commerciale.service';

@Component({
  selector: 'app-assignments',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './assignments.component.html',
  styleUrl: './assignments.component.css'
})
export class AssignmentsComponent implements OnInit {
  query = signal('');
  status = signal('all');
  priority = signal('all');
  selectedAssignment = signal<CommercialAssignment | undefined>(undefined);

  statusOptions = computed(() => this.uniqueValues('status'));
  priorityOptions = computed(() => this.uniqueValues('priority'));
  filteredAssignments = computed(() => {
    const query = this.query().trim().toLowerCase();
    const status = this.status();
    const priority = this.priority();

    return this.assignments.assignments().filter((assignment) => {
      const matchesQuery = !query || [
        assignment.code,
        assignment.title,
        assignment.description,
        assignment.customerName,
        assignment.plantCode,
        assignment.address,
        assignment.technicianName
      ].join(' ').toLowerCase().includes(query);
      const matchesStatus = status === 'all' || assignment.status === status;
      const matchesPriority = priority === 'all' || assignment.priority === priority;
      return matchesQuery && matchesStatus && matchesPriority;
    });
  });

  activeCount = computed(() => this.assignments.assignments().filter((item) => item.status !== 'completata').length);
  overdueCount = computed(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return this.assignments.assignments().filter((item) => {
      if (!item.dueDate || item.status === 'completata') {
        return false;
      }
      return new Date(item.dueDate) < today;
    }).length;
  });

  constructor(public assignments: AssegnazioniCommercialeService) {}

  ngOnInit(): void {
    this.assignments.loadAssignmentsOnly();
  }

  openDetail(assignment: CommercialAssignment): void {
    this.selectedAssignment.set(assignment);
  }

  closeDetail(): void {
    this.selectedAssignment.set(undefined);
  }

  clearFilters(): void {
    this.query.set('');
    this.status.set('all');
    this.priority.set('all');
  }

  statusLabel(status: string): string {
    return status.replace(/_/g, ' ');
  }

  statusTone(status: string): 'neutral' | 'success' | 'warning' {
    if (status === 'completata') {
      return 'success';
    }
    if (status === 'in_corso') {
      return 'warning';
    }
    return 'neutral';
  }

  dueDateTone(assignment: CommercialAssignment): 'neutral' | 'danger' {
    if (!assignment.dueDate || assignment.status === 'completata') {
      return 'neutral';
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(assignment.dueDate) < today ? 'danger' : 'neutral';
  }

  private uniqueValues(field: 'status' | 'priority'): string[] {
    return [...new Set(this.assignments.assignments()
      .map((assignment) => assignment[field])
      .filter(Boolean))]
      .sort((left, right) => left.localeCompare(right));
  }
}
