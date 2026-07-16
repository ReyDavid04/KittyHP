import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RepairReport, RepairUpsertPayload } from '../../../core/models/repair-report.model';
import { RepairReportsApiService } from '../../../core/services/repair-reports-api.service';
import { RepairFormComponent } from '../components/repair-form.component';
import { RepairColumnFilters, RepairListComponent } from '../components/repair-list.component';

@Component({
  standalone: true,
  imports: [CommonModule, RepairFormComponent, RepairListComponent],
  template: `
    <section class="panel">
      <div class="toolbar">
        <div class="search-box">
          <label for="globalSearch">Buscar</label>
          <input id="globalSearch" type="search" [value]="searchTerm" (input)="setSearch($any($event.target).value)" placeholder="Buscar en toda la tabla">
        </div>
        <div class="toolbar-actions">
          <button type="button" class="primary" (click)="openNewRepair()">Crear nuevo</button>
        </div>
      </div>

      <app-repair-list
        [repairs]="pagedRepairs"
        [filters]="filters"
        (filterChange)="updateFilter($event.key, $event.value)"
        (edit)="openEditRepair($event)"
        (remove)="removeRepair($event)"
      ></app-repair-list>

      <div class="pagination" *ngIf="filteredRepairs.length">
        <button type="button" [disabled]="currentPage === 1" (click)="goToPage(currentPage - 1)">Anterior</button>
        <span>Página {{ currentPage }} de {{ totalPages }}</span>
        <button type="button" [disabled]="currentPage === totalPages" (click)="goToPage(currentPage + 1)">Siguiente</button>
      </div>

      <div class="modal-backdrop" *ngIf="showForm">
        <div class="modal">
          <app-repair-form
            [repair]="selectedRepair"
            (save)="saveRepair($event)"
            (cancel)="closeForm()"
          ></app-repair-form>
        </div>
      </div>
    </section>
  `,
  styles: [
    `
      .panel {
        display: grid;
        gap: 16px;
      }

      .toolbar {
        display: flex;
        align-items: end;
        justify-content: space-between;
        gap: 16px;
        padding: 16px 20px;
        border: 1px solid var(--border);
        border-radius: 18px;
        background: var(--surface);
      }

      .search-box {
        display: grid;
        gap: 6px;
        min-width: min(100%, 420px);
      }

      .search-box label {
        font-size: 0.75rem;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--muted);
      }

      .search-box input {
        padding: 12px 14px;
        border: 1px solid var(--border);
        border-radius: 12px;
      }

      .toolbar-actions {
        display: flex;
        gap: 12px;
      }

      .primary,
      .pagination button {
        border: 0;
        border-radius: 12px;
        background: var(--primary);
        color: #fff;
        padding: 12px 16px;
        cursor: pointer;
      }

      .pagination {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 12px;
        color: var(--muted);
      }

      .pagination button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .modal-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(8, 15, 28, 0.55);
        display: grid;
        place-items: center;
        padding: 24px;
        z-index: 40;
      }

      .modal {
        width: min(980px, 100%);
        max-height: calc(100vh - 48px);
        overflow: auto;
        border-radius: 20px;
        box-shadow: 0 28px 60px rgba(0, 0, 0, 0.25);
      }
    `,
  ],
})
export class RepairsPageComponent {
  readonly repairReportsApi = inject(RepairReportsApiService);
  repairs: RepairReport[] = [];
  searchTerm = '';
  currentPage = 1;
  readonly pageSize = 8;
  showForm = false;
  selectedRepair: RepairReport | null = null;

  filters: RepairColumnFilters = {
    recordDate: '',
    topIssue: '',
    failureQty: '',
    buildQty: '',
    frPercentage: '',
    category: '',
    returnStatus: '',
    failPicture: '',
    majorPart: '',
    repairResult: '',
    failureFactor: '',
    actions: '',
    evidencePicture: '',
  };

  constructor() {
    this.loadRepairs();
  }

  get filteredRepairs(): RepairReport[] {
    const search = this.searchTerm.trim().toLowerCase();

    return this.repairs.filter((repair) => {
      const searchableValues = [
        repair.recordDate,
        repair.topIssue,
        String(repair.failureQty),
        String(repair.buildQty),
        String(repair.frPercentage),
        repair.category,
        repair.returnStatus ?? '',
        repair.failPicture ?? '',
        repair.majorPart ?? '',
        repair.repairResult ?? '',
        repair.failureFactor ?? '',
        repair.actions ?? '',
        repair.evidencePicture ?? '',
      ]
        .join(' ')
        .toLowerCase();

      if (search && !searchableValues.includes(search)) {
        return false;
      }

      return Object.entries(this.filters).every(([key, value]) => {
        const filterValue = value.trim().toLowerCase();

        if (!filterValue) {
          return true;
        }

        const repairValue = String((repair as unknown as Record<string, unknown>)[key] ?? '').toLowerCase();
        return repairValue.includes(filterValue);
      });
    });
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredRepairs.length / this.pageSize));
  }

  get pagedRepairs(): RepairReport[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredRepairs.slice(start, start + this.pageSize);
  }

  saveRepair(payload: RepairUpsertPayload) {
    const request$ = this.selectedRepair ? this.repairReportsApi.update(this.selectedRepair.id, payload) : this.repairReportsApi.create(payload);

    request$.subscribe(() => {
      this.closeForm();
      this.loadRepairs();
    });
  }

  loadRepairs(): void {
    this.repairReportsApi.getAll().subscribe((repairs) => {
      this.repairs = repairs;
      this.currentPage = 1;
    });
  }

  openNewRepair(): void {
    this.selectedRepair = null;
    this.showForm = true;
  }

  openEditRepair(repair: RepairReport): void {
    this.selectedRepair = repair;
    this.showForm = true;
  }

  closeForm(): void {
    this.selectedRepair = null;
    this.showForm = false;
  }

  removeRepair(id: string) {
    this.repairReportsApi.delete(id).subscribe(() => {
      if (this.selectedRepair?.id === id) {
        this.closeForm();
      }

      this.loadRepairs();
    });
  }

  setSearch(value: string): void {
    this.searchTerm = value;
    this.currentPage = 1;
  }

  updateFilter(key: keyof RepairColumnFilters, value: string): void {
    this.filters = { ...this.filters, [key]: value };
    this.currentPage = 1;
  }

  goToPage(page: number): void {
    this.currentPage = Math.min(Math.max(page, 1), this.totalPages);
  }
}

