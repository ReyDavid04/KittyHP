import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import {
  RepairCatalogItem,
  RepairCatalogType,
  RepairReportsApiService,
} from '../../../core/services/repair-reports-api.service';
import { UiAlertComponent, UiBadgeComponent, UiIconComponent, UiPageHeaderComponent, UiStateComponent } from '../../../shared/ui';

type CatalogDefinition = {
  type: RepairCatalogType;
  title: string;
  singular: string;
  description: string;
};

const CATALOGS: CatalogDefinition[] = [
  { type: 'family', title: 'Family', singular: 'Family', description: 'Opciones de Family disponibles para clasificar cada reporte.' },
  { type: 'top_issue', title: 'Top Issue', singular: 'top issue', description: 'Fallas principales disponibles al crear un reporte.' },
  { type: 'category', title: 'Category', singular: 'categoría', description: 'Categorías utilizadas para clasificar los reportes.' },
  { type: 'major_part', title: 'Major Part', singular: 'parte principal', description: 'Partes principales relacionadas con una falla.' },
  { type: 'failure_factor', title: 'Failure Factor', singular: 'factor de falla', description: 'Factores o causas de falla disponibles en el formulario.' },
];

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, UiAlertComponent, UiBadgeComponent, UiIconComponent, UiPageHeaderComponent, UiStateComponent],
  template: `
    <section class="catalog-page ui-page">
      <section class="catalog-panel" [attr.aria-busy]="loading">
        <app-ui-page-header [title]="currentCatalog.title" [description]="currentCatalog.description">
          <app-ui-badge tone="info">{{ items.length }} elementos</app-ui-badge>
        </app-ui-page-header>

        <form class="create-row" (ngSubmit)="createItem()">
          <label class="ui-field">
            <span>Nuevo valor</span>
            <input class="ui-control" type="text" name="newCatalogValue" [(ngModel)]="newValue" [placeholder]="'Escribe ' + currentCatalog.singular" maxlength="255" autocomplete="off">
          </label>
          <button class="ui-button ui-button-primary" type="submit" [disabled]="saving || !newValue.trim()"><app-ui-icon name="add"></app-ui-icon>Agregar</button>
        </form>

        <div class="search-row">
          <label class="search-field">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m21 21-4.35-4.35m2.35-5.65a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z"></path></svg>
            <input class="ui-control ui-search-input" type="search" name="catalogSearch" [(ngModel)]="searchTerm" placeholder="Buscar valor en el catálogo..." autocomplete="off">
            <button *ngIf="searchTerm" type="button" class="ui-input-action ui-search-clear" aria-label="Limpiar búsqueda" (click)="searchTerm = ''"><app-ui-icon name="close"></app-ui-icon></button>
          </label>
          <span class="search-count" *ngIf="searchTerm.trim()">{{ filteredItems.length }} de {{ items.length }} resultados</span>
        </div>

        <app-ui-alert *ngIf="errorMessage" class="error-message" tone="danger">{{ errorMessage }}</app-ui-alert>
        <app-ui-state *ngIf="loading" kind="loading" message="Cargando catálogo..."></app-ui-state>

        <div class="table-wrap ui-table-shell" *ngIf="!loading">
          <table *ngIf="items.length; else emptyCatalog">
            <caption class="sr-only">Valores del catálogo {{ currentCatalog.title }}</caption>
            <thead><tr><th scope="col">Valor</th><th scope="col" class="status-column">Estatus</th><th scope="col" class="actions-column">Opciones</th></tr></thead>
            <tbody>
              <tr *ngFor="let item of filteredItems; trackBy: trackById">
                <td>
                  <input *ngIf="editingId === item.id; else valueText" type="text" [(ngModel)]="editValue" [ngModelOptions]="{ standalone: true }" maxlength="255" class="inline-input ui-control">
                  <ng-template #valueText><strong>{{ item.value }}</strong></ng-template>
                </td>
                <td><app-ui-badge [tone]="item.isActive ? 'success' : 'neutral'" [dot]="true">{{ item.isActive ? 'Activo' : 'Inactivo' }}</app-ui-badge></td>
                <td>
                  <div class="row-actions" *ngIf="editingId !== item.id; else editActions">
                    <button type="button" class="ui-button ui-button-secondary" (click)="startEdit(item)">Editar</button>
                    <button type="button" class="ui-button ui-button-secondary" (click)="toggleActive(item)">{{ item.isActive ? 'Desactivar' : 'Activar' }}</button>
                    <button type="button" class="ui-button ui-button-danger" (click)="deleteItem(item)">Eliminar</button>
                  </div>
                  <ng-template #editActions>
                    <div class="row-actions">
                      <button type="button" class="ui-button ui-button-primary" (click)="saveEdit(item)" [disabled]="saving || !editValue.trim()">Guardar</button>
                      <button type="button" class="ui-button ui-button-secondary" (click)="cancelEdit()">Cancelar</button>
                    </div>
                  </ng-template>
                </td>
              </tr>
              <tr *ngIf="!filteredItems.length"><td colspan="3"><app-ui-state size="sm" title="No se encontraron resultados." message="Prueba con otro término de búsqueda."></app-ui-state></td></tr>
            </tbody>
          </table>

          <ng-template #emptyCatalog><app-ui-state title="Este catálogo todavía no tiene valores." message="Agrega el primer elemento usando el formulario superior."></app-ui-state></ng-template>
        </div>
      </section>
    </section>
  `,
  styleUrl: './catalog-management-page.component.css',
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
  searchTerm = '';
  editingId: string | null = null;
  editValue = '';

  constructor() {
    this.route.paramMap.subscribe((params) => {
      const requestedType = params.get('type') as RepairCatalogType | null;
      this.currentCatalog = CATALOGS.find((catalog) => catalog.type === requestedType) ?? CATALOGS[0];
      this.searchTerm = '';
      this.cancelEdit();
      this.loadItems();
    });
  }

  get filteredItems(): RepairCatalogItem[] {
    const search = this.searchTerm.trim().toLocaleLowerCase();
    return search ? this.items.filter((item) => item.value.toLocaleLowerCase().includes(search)) : this.items;
  }

  createItem(): void {
    const value = this.newValue.trim();
    if (!value || this.saving) return;
    this.saving = true;
    this.errorMessage = '';
    this.repairReportsApi.createCatalogItem(this.currentCatalog.type, { value, isActive: true }).subscribe({
      next: () => { this.newValue = ''; this.saving = false; this.loadItems(); },
      error: (error: unknown) => { this.saving = false; this.errorMessage = this.readError(error); },
    });
  }

  startEdit(item: RepairCatalogItem): void { this.editingId = item.id; this.editValue = item.value; this.errorMessage = ''; }
  cancelEdit(): void { this.editingId = null; this.editValue = ''; }

  saveEdit(item: RepairCatalogItem): void {
    const value = this.editValue.trim();
    if (!value || this.saving) return;
    this.saving = true;
    this.errorMessage = '';
    this.repairReportsApi.updateCatalogItem(this.currentCatalog.type, item.id, { value }).subscribe({
      next: () => { this.saving = false; this.cancelEdit(); this.loadItems(); },
      error: (error: unknown) => { this.saving = false; this.errorMessage = this.readError(error); },
    });
  }

  toggleActive(item: RepairCatalogItem): void {
    if (this.saving) return;
    this.saving = true;
    this.errorMessage = '';
    this.repairReportsApi.updateCatalogItem(this.currentCatalog.type, item.id, { isActive: !item.isActive }).subscribe({
      next: (updated) => { this.items = this.items.map((current) => current.id === updated.id ? updated : current); this.saving = false; },
      error: (error: unknown) => { this.saving = false; this.errorMessage = this.readError(error); },
    });
  }

  deleteItem(item: RepairCatalogItem): void {
    if (!window.confirm(`¿Eliminar "${item.value}" del catálogo ${this.currentCatalog.title}?`)) return;
    this.saving = true;
    this.errorMessage = '';
    this.repairReportsApi.deleteCatalogItem(this.currentCatalog.type, item.id).subscribe({
      next: () => { this.items = this.items.filter((current) => current.id !== item.id); this.saving = false; },
      error: (error: unknown) => { this.saving = false; this.errorMessage = this.readError(error); },
    });
  }

  trackById(_index: number, item: RepairCatalogItem): string { return item.id; }

  private loadItems(): void {
    this.loading = true;
    this.errorMessage = '';
    this.repairReportsApi.getCatalogItems(this.currentCatalog.type).subscribe({
      next: (items) => { this.items = items; this.loading = false; },
      error: (error: unknown) => { this.items = []; this.loading = false; this.errorMessage = this.readError(error); },
    });
  }

  private readError(error: unknown): string {
    const response = error as { error?: { message?: string | string[] } };
    const message = response.error?.message;
    return Array.isArray(message) ? message.join(', ') : message || 'No fue posible completar la operación.';
  }
}
