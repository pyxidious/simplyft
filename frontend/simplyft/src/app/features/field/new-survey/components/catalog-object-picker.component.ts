import { CommonModule } from '@angular/common';
import { Component, EventEmitter, OnInit, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CatalogItem } from '../../../../core/models/simplyft.models';
import { InspectionService } from '../../../../core/services/inspection.service';

@Component({
  selector: 'app-catalog-object-picker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './catalog-object-picker.component.html',
  styleUrl: './catalog-object-picker.component.css'
})
export class CatalogObjectPickerComponent implements OnInit {
  @Output() itemSelected = new EventEmitter<CatalogItem>();

  query = '';
  newName = '';
  newCategory = '';
  newDescription = '';
  loading = signal(false);
  saving = signal(false);
  creating = signal(false);
  results = signal<CatalogItem[]>([]);
  categories = signal<string[]>([]);

  constructor(private inspections: InspectionService) {}

  ngOnInit(): void {
    this.search();
    this.inspections.getCategories().subscribe((categories) => this.categories.set(categories));
  }

  search(): void {
    this.loading.set(true);
    this.inspections.searchCatalogItems(this.query).subscribe({
      next: (items) => {
        this.results.set(items.slice(0, 6));
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  select(item: CatalogItem): void {
    this.itemSelected.emit(item);
    this.query = '';
    this.search();
  }

  openCreate(): void {
    this.newName = this.query.trim();
    this.newCategory = this.categories()[0] ?? '';
    this.newDescription = '';
    this.creating.set(true);
  }

  create(): void {
    if (!this.newName.trim() || !this.newCategory.trim()) {
      return;
    }
    this.saving.set(true);
    this.inspections.createCatalogItem({
      name: this.newName.trim(),
      category: this.newCategory.trim(),
      shortDescription: this.newDescription.trim()
    }).subscribe((item) => {
      this.saving.set(false);
      this.creating.set(false);
      this.itemSelected.emit(item);
      this.search();
    });
  }
}

