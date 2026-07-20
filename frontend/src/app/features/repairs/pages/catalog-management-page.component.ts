import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import {
  RepairCatalogItem,
  RepairCatalogType,
  RepairReportsApiService,
} from '../../../core/services/repair-reports-api.service';

type CatalogDefinition = {
  type: RepairCatalogType;
  title: string;
  singular: string;
  description: string;
};

const CATALOGS: CatalogDefinition[] = [
  {
    type: 'top_issue',
    title: 'Top Issue',
    singular: 'top issue',
    description: 'Fallas principales disponibles al crear un reporte.',
  },
  {
    type: 'category',
    title: 'Category',
    singular: 'categoría',
    description: 'Categorías utilizadas para clasificar los reportes.',
  },
  {
    type: 'major_part',
    title: 'Major Part',
    singular: 'parte principal',
    description: 'Partes principales que pueden estar relacionadas con una falla.',
  },
  {
    type: 'failure_factor',
    title: 'Failure Factor',
    singular: 'factor de falla',
    description: 'Factores o causas de falla disponibles en el formulario.',
  },
];

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="catalog-page">
      <header class="page-header">
        <h1>Administración de catálogos</h1>
      </header>

      <section class="catalog-panel">
        <div class="panel-heading">
          <div>
            <h2>{{ currentCatalog.title }}</h2>
            <p>{{ currentCatalog.description }}</p>
          </div>
          <span class="item-count">{{ items.length }} elementos</span>
        </div>

        <form class="create-row" (ngSubmit)="createItem()">
          <label>
            <span>Nuevo valor</span>
            <input
              type="text"
              name="newCatalogValue"
              [(ngModel)]="newValue"
              [placeholder]="'Escribe un ' + currentCatalog.singular"
              maxlength="255"
              autocomplete="off"
            >
          </label>

          <button type="submit" [disabled]="saving || !newValue.trim()">
            <span aria-hidden="true">+</span>
            Agregar
          </button>
        </form>

        <div *ngIf="errorMessage" class="error-message" role="alert">
          {{ errorMessage }}
        </div>

        <div *ngIf="loading" class="loading-state">Cargando catálogo...</div>

        <div class="table-wrap" *ngIf="!loading">
          <table *ngIf="items.length; else emptyCatalog">
            <thead>
              <tr>
                <th>Valor</th>
                <th class="status-column">Estatus</th>
                <th class="actions-column">Opciones</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let item of items; trackBy: trackById">
                <td>
                  <input
                    *ngIf="editingId === item.id; else valueText"
                    type="text"
                    [(ngModel)]="editValue"
                    [ngModelOptions]="{ standalone: true }"
                    maxlength="255"
                    class="inline-input"
                  >
                  <ng-template #valueText><strong>{{ item.value }}</strong></ng-template>
                </td>
                <td>
                  <span class="status" [class.inactive]="!item.isActive">
                    {{ item.isActive ? 'Activo' : 'Inactivo' }}
                  </span>
                </td>
                <td>
                  <div class="row-actions" *ngIf="editingId !== item.id; else editActions">
                    <button type="button" class="text-button" (click)="startEdit(item)">Editar</button>
                    <button type="button" class="text-button" (click)="toggleActive(item)">
                      {{ item.isActive ? 'Desactivar' : 'Activar' }}
                    </button>
                    <button type="button" class="text-button danger" (click)="deleteItem(item)">Eliminar</button>
                  </div>
                  <ng-template #editActions>
                    <div class="row-actions">
                      <button
                        type="button"
                        class="text-button primary"
                        (click)="saveEdit(item)"
                        [disabled]="saving || !editValue.trim()"
                      >
                        Guardar
                      </button>
                      <button type="button" class="text-button" (click)="cancelEdit()">Cancelar</button>
                    </div>
                  </ng-template>
                </td>
              </tr>
            </tbody>
          </table>

          <ng-template #emptyCatalog>
            <div class="empty-state">
              <strong>Este catálogo todavía no tiene valores.</strong>
              <span>Agrega el primer elemento usando el formulario superior.</span>
            </div>
          </ng-template>
        </div>
      </section>
    </section>
  `,
  styles: [
    `
      :host {
        display: block;
        min-height: calc(100dvh - 50px);
        background: #f5f7fa;
      }

      .catalog-page {
        width: 100%;
      }

      .page-header {
        display: flex;
        align-items: center;
        min-height: 58px;
        padding: 9px 22px;
        border-bottom: 1px solid var(--border);
        background: #fff;
      }

      h1,
      h2,
      p {
        margin: 0;
      }

      h1 {
        font-size: clamp(1.15rem, 1.6vw, 1.4rem);
        font-weight: 800;
        line-height: 1.1;
        letter-spacing: -0.025em;
      }

      .catalog-panel {
        margin: 20px 24px;
        overflow: hidden;
        border: 1px solid var(--border);
        border-radius: 12px;
        background: #fff;
        box-shadow: var(--shadow-sm);
      }

      .panel-heading {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 18px;
        padding: 18px 20px;
        border-bottom: 1px solid var(--border);
      }

      .panel-heading > div {
        display: grid;
        gap: 5px;
      }

      h2 {
        font-size: 1.05rem;
      }

      .panel-heading p {
        color: var(--muted);
        font-size: 0.76rem;
      }

      .item-count {
        padding: 5px 9px;
        border-radius: 999px;
        color: var(--primary);
        font-size: 0.68rem;
        font-weight: 700;
        background: var(--primary-soft);
        white-space: nowrap;
      }

      .create-row {
        display: grid;
        grid-template-columns: minmax(260px, 1fr) auto;
        align-items: end;
        gap: 12px;
        padding: 16px 20px;
        border-bottom: 1px solid var(--border);
        background: #fbfcfe;
      }

      .create-row label {
        display: grid;
        gap: 6px;
        color: #455267;
        font-size: 0.7rem;
        font-weight: 700;
      }

      input {
        width: 100%;
        height: 38px;
        padding: 0 11px;
        border: 1px solid var(--border);
        border-radius: 8px;
        color: var(--text);
        background: #fff;
      }

      input:focus {
        border-color: rgba(47, 126, 199, 0.6);
        box-shadow: 0 0 0 3px rgba(47, 126, 199, 0.09);
      }

      .create-row button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 7px;
        min-height: 38px;
        padding: 8px 14px;
        border: 1px solid var(--primary);
        border-radius: 8px;
        color: #fff;
        font-size: 0.75rem;
        font-weight: 750;
        background: var(--primary);
        cursor: pointer;
      }

      button:disabled {
        opacity: 0.48;
        cursor: not-allowed;
      }

      .error-message {
        padding: 11px 20px;
        border-bottom: 1px solid #f5c8d0;
        color: var(--danger);
        font-size: 0.74rem;
        background: var(--danger-soft);
      }

      .loading-state,
      .empty-state {
        display: grid;
        place-items: center;
        min-height: 220px;
        padding: 30px;
        color: var(--muted);
        font-size: 0.78rem;
      }

      .empty-state {
        gap: 6px;
        text-align: center;
      }

      .empty-state strong {
        color: var(--text);
      }

      .table-wrap {
        overflow-x: auto;
      }

      table {
        width: 100%;
        min-width: 660px;
        border-spacing: 0;
        border-collapse: separate;
      }

      th,
      td {
        padding: 12px 16px;
        border-bottom: 1px solid #e8edf3;
        text-align: left;
      }

      th {
        color: #647287;
        font-size: 0.66rem;
        font-weight: 750;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        background: #f7f9fc;
      }

      td {
        color: #354258;
        font-size: 0.76rem;
      }

      tbody tr:last-child td {
        border-bottom: 0;
      }

      tbody tr:hover td {
        background: #fbfdff;
      }

      .status-column {
        width: 130px;
      }

      .actions-column {
        width: 280px;
      }

      .status {
        display: inline-flex;
        padding: 4px 8px;
        border-radius: 999px;
        color: var(--success);
        font-size: 0.67rem;
        font-weight: 750;
        background: var(--success-soft);
      }

      .status.inactive {
        color: var(--muted);
        background: var(--surface-muted);
      }

      .row-actions {
        display: flex;
        align-items: center;
        gap: 6px;
        flex-wrap: wrap;
      }

      .text-button {
        min-height: 30px;
        padding: 5px 9px;
        border: 1px solid var(--border);
        border-radius: 7px;
        color: #536176;
        font-size: 0.69rem;
        font-weight: 700;
        background: #fff;
        cursor: pointer;
      }

      .text-button:hover {
        border-color: var(--border-strong);
        color: var(--primary);
        background: var(--surface-subtle);
      }

      .text-button.primary {
        border-color: var(--primary);
        color: #fff;
        background: var(--primary);
      }

      .text-button.danger {
        color: var(--danger);
      }

      .inline-input {
        max-width: 520px;
      }

      @media (max-width: 720px) {
        .page-header {
          padding: 9px 12px;
        }

        .catalog-panel {
          margin: 12px;
        }

        .panel-heading {
          align-items: flex-start;
          flex-direction: column;
        }

        .create-row {
          grid-template-columns: 1fr;
        }

        .create-row button {
          width: 100%;
        }
      }
    `,
  ],
})
export class CatalogManagementPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly repairReportsApi = inject(RepairReportsApiService);

  currentCatalog: CatalogDefinition = CATALOGS[0];
  items: RepairCatalogItem[] = [];
  loading = true;
  saving = false;
  errorMessage = '';
  newValue = '';
  editingId: string | null = null;
  editValue = '';

  constructor() {
    this.route.paramMap.subscribe((params) => {
      const requestedType = params.get('type') as RepairCatalogType | null;
      this.currentCatalog = CATALOGS.find((catalog) => catalog.type === requestedType) ?? CATALOGS[0];
      this.cancelEdit();
      this.loadItems();
    });
  }

  createItem(): void {
    const value = this.newValue.trim();

    if (!value || this.saving) {
      return;
    }

    this.saving = true;
    this.errorMessage = '';
    this.repairReportsApi.createCatalogItem(this.currentCatalog.type, {
      value,
      isActive: true,
    }).subscribe({
      next: () => {
        this.newValue = '';
        this.saving = false;
        this.loadItems();
      },
      error: (error: unknown) => {
        this.saving = false;
        this.errorMessage = this.readError(error);
      },
    });
  }

  startEdit(item: RepairCatalogItem): void {
    this.editingId = item.id;
    this.editValue = item.value;
    this.errorMessage = '';
  }

  cancelEdit(): void {
    this.editingId = null;
    this.editValue = '';
  }

  saveEdit(item: RepairCatalogItem): void {
    const value = this.editValue.trim();

    if (!value || this.saving) {
      return;
    }

    this.saving = true;
    this.errorMessage = '';
    this.repairReportsApi.updateCatalogItem(this.currentCatalog.type, item.id, { value }).subscribe({
      next: () => {
        this.saving = false;
        this.cancelEdit();
        this.loadItems();
      },
      error: (error: unknown) => {
        this.saving = false;
        this.errorMessage = this.readError(error);
      },
    });
  }

  toggleActive(item: RepairCatalogItem): void {
    if (this.saving) {
      return;
    }

    this.saving = true;
    this.errorMessage = '';
    this.repairReportsApi.updateCatalogItem(this.currentCatalog.type, item.id, {
      isActive: !item.isActive,
    }).subscribe({
      next: (updatedItem) => {
        this.items = this.items.map((current) => current.id === updatedItem.id ? updatedItem : current);
        this.saving = false;
      },
      error: (error: unknown) => {
        this.saving = false;
        this.errorMessage = this.readError(error);
      },
    });
  }

  deleteItem(item: RepairCatalogItem): void {
    if (!window.confirm(`¿Eliminar "${item.value}" del catálogo ${this.currentCatalog.title}?`)) {
      return;
    }

    this.saving = true;
    this.errorMessage = '';
    this.repairReportsApi.deleteCatalogItem(this.currentCatalog.type, item.id).subscribe({
      next: () => {
        this.items = this.items.filter((current) => current.id !== item.id);
        this.saving = false;
      },
      error: (error: unknown) => {
        this.saving = false;
        this.errorMessage = this.readError(error);
      },
    });
  }

  trackById(_index: number, item: RepairCatalogItem): string {
    return item.id;
  }

  private loadItems(): void {
    this.loading = true;
    this.errorMessage = '';
    this.repairReportsApi.getCatalogItems(this.currentCatalog.type).subscribe({
      next: (items) => {
        this.items = items;
        this.loading = false;
      },
      error: (error: unknown) => {
        this.items = [];
        this.loading = false;
        this.errorMessage = this.readError(error);
      },
    });
  }

  private readError(error: unknown): string {
    const response = error as { error?: { message?: string | string[] } };
    const message = response.error?.message;

    if (Array.isArray(message)) {
      return message.join(', ');
    }

    return message || 'No fue posible completar la operación.';
  }
}
