import { CommonModule } from '@angular/common';
import { Component, EventEmitter, OnInit, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CatalogItem } from '../../../../core/models/simplyft.models';
import { InspectionService } from '../../../../core/services/inspection.service';

@Component({
  selector: 'app-catalog-object-picker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="survey-panel catalog-picker">
      <div class="panel-title-row">
        <div>
          <p class="eyebrow">Catalogo oggetti</p>
          <h2>Aggiungi una voce al rilievo</h2>
        </div>
        <button class="btn secondary" type="button" (click)="openCreate()">+ Nuovo oggetto</button>
      </div>

      <label class="search-field compact-search">
        <input
          [(ngModel)]="query"
          (ngModelChange)="search()"
          placeholder="Cerca oggetto nel catalogo..."
          aria-label="Cerca oggetto nel catalogo"
        />
        <span>⌕</span>
      </label>

      <div class="catalog-results">
        <button type="button" *ngFor="let item of results()" (click)="select(item)">
          <span>
            <strong>{{ item.name }}</strong>
            <small>{{ item.categoryName || 'Categoria non indicata' }}</small>
          </span>
          <b>{{ item.listMaterialPrice || 0 | currency:'EUR':'symbol':'1.2-2' }}</b>
        </button>
      </div>

      <div class="empty-catalog" *ngIf="query.trim() && !loading() && !results().length">
        <p>Nessun risultato trovato.</p>
        <button class="btn primary" type="button" (click)="openCreate()">Aggiungi nuovo oggetto</button>
      </div>

      <div class="modal-backdrop" *ngIf="creating()">
        <form class="catalog-modal" (ngSubmit)="create()">
          <header>
            <h2>Nuovo oggetto catalogo</h2>
            <button type="button" aria-label="Chiudi" (click)="creating.set(false)">×</button>
          </header>
          <label class="field">
            <span>Nome oggetto</span>
            <input [(ngModel)]="newName" name="newName" required />
          </label>
          <label class="field">
            <span>Categoria</span>
            <input [(ngModel)]="newCategory" name="newCategory" list="category-options" required />
            <datalist id="category-options">
              <option *ngFor="let category of categories()" [value]="category"></option>
            </datalist>
          </label>
          <label class="field">
            <span>Descrizione breve</span>
            <textarea [(ngModel)]="newDescription" name="newDescription"></textarea>
          </label>
          <div class="button-row">
            <button class="btn ghost" type="button" (click)="creating.set(false)">Annulla</button>
            <button class="btn primary" type="submit" [disabled]="saving() || !newName.trim() || !newCategory.trim()">Salva e seleziona</button>
          </div>
        </form>
      </div>
    </section>
  `
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
