import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { AuthService, UserRole } from '../../../core/services/auth.service';
import { UiAlertComponent, UiBadgeComponent, UiIconComponent, UiPageHeaderComponent, UiStateComponent } from '../../../shared/ui';
import {
  CreateUserPayload,
  ManagedUser,
  UpdateUserPayload,
  UserManagementApiService,
} from '../../../core/services/user-management-api.service';

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, UiAlertComponent, UiBadgeComponent, UiIconComponent, UiPageHeaderComponent, UiStateComponent],
  template: `
    <section class="users-page ui-page">
      <app-ui-page-header title="Usuarios" description="Administra los correos que pueden ingresar al sistema.">
        <button type="button" class="ui-button ui-button-primary" (click)="startCreate()" *ngIf="!showForm">
          <app-ui-icon name="add"></app-ui-icon> Agregar usuario
        </button>
      </app-ui-page-header>

      <div class="users-content" [attr.aria-busy]="isLoading">
        <form class="user-form ui-card" [formGroup]="form" (ngSubmit)="saveUser()" *ngIf="showForm" novalidate>
          <div class="form-heading">
            <div>
              <strong>{{ editingUserId ? 'Editar usuario' : 'Nuevo usuario' }}</strong>
              <span>{{ editingUserId ? 'La contraseña solo cambiará si capturas una nueva.' : 'Captura el correo y la contraseña.' }}</span>
            </div>
            <button type="button" class="ui-icon-button" (click)="cancelForm()" aria-label="Cerrar formulario"><app-ui-icon name="close"></app-ui-icon></button>
          </div>

          <div class="form-grid">
            <label class="email-field ui-field">
              <span>Correo</span>
              <div class="email-input ui-control" [class.invalid]="isInvalid('email')">
                <input class="ui-control" type="text" formControlName="email" autocomplete="off" placeholder="Ramos.Rey" [attr.aria-invalid]="isInvalid('email')">
                <span>&#64;inventec.com</span>
              </div>
            </label>

            <label class="ui-field">
              <span>{{ editingUserId ? 'Nueva contraseña' : 'Contraseña' }}</span>
              <input class="ui-control" type="password" formControlName="password" autocomplete="new-password" [placeholder]="editingUserId ? 'Dejar vacío para conservar' : 'Mínimo 8 caracteres'" [class.invalid]="isInvalid('password')" [attr.aria-invalid]="isInvalid('password')">
            </label>

            <label class="ui-field">
              <span>Confirmar contraseña</span>
              <input class="ui-control" type="password" formControlName="confirmPassword" autocomplete="new-password" [placeholder]="editingUserId ? 'Repite la nueva contraseña' : 'Repite la contraseña'" [class.invalid]="isInvalid('confirmPassword') || passwordsDoNotMatch" [attr.aria-invalid]="isInvalid('confirmPassword') || passwordsDoNotMatch">
            </label>

            <label class="ui-field">
              <span>Rol</span>
              <select class="ui-control" formControlName="role">
                <option value="user">Usuario</option>
                <option value="admin">Administrador</option>
                <option value="viewer">Viewer</option>
              </select>
            </label>

            <label class="ui-field">
              <span>Estado</span>
              <button type="button" class="status-toggle ui-control" [class.active]="form.controls.isActive.value" [attr.aria-pressed]="form.controls.isActive.value" (click)="toggleStatus()">
                <span class="toggle-track"><i></i></span>
                {{ form.controls.isActive.value ? 'Activo' : 'Inactivo' }}
              </button>
            </label>
          </div>

          <app-ui-alert *ngIf="formError" tone="danger">{{ formError }}</app-ui-alert>

          <div class="form-actions">
            <button type="button" class="ui-button ui-button-secondary" (click)="cancelForm()">Cancelar</button>
            <button type="submit" class="ui-button ui-button-primary" [disabled]="isSaving">
              {{ isSaving ? 'Guardando...' : (editingUserId ? 'Guardar cambios' : 'Crear usuario') }}
            </button>
          </div>
        </form>

        <div class="toolbar">
          <div class="search-box ui-control">
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-4-4"></path></svg>
            <input type="search" [value]="searchTerm" (input)="searchTerm = $any($event.target).value" placeholder="Buscar correo...">
          </div>
          <span class="record-count">{{ filteredUsers.length }} {{ filteredUsers.length === 1 ? 'registro' : 'registros' }}</span>
        </div>

        <app-ui-alert *ngIf="pageError" tone="danger">{{ pageError }}</app-ui-alert>
        <app-ui-state *ngIf="isLoading" kind="loading" message="Cargando usuarios..."></app-ui-state>

        <div class="ui-table-shell" *ngIf="!isLoading">
          <table class="users-table">
            <caption class="sr-only">Listado de usuarios del sistema</caption>
            <thead>
              <tr>
                <th scope="col">Correo</th>
                <th scope="col">Rol</th>
                <th scope="col">Estado</th>
                <th scope="col">Actualizado</th>
                <th scope="col" class="actions-column">Opciones</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let user of filteredUsers; trackBy: trackByUserId">
                <td>
                  <div class="user-email">
                    <span class="avatar">{{ initials(user.email) }}</span>
                    <div><strong>{{ user.email }}</strong><small *ngIf="isCurrentUser(user)">Tu cuenta</small></div>
                  </div>
                </td>
                <td><app-ui-badge [tone]="user.role === 'admin' ? 'info' : 'neutral'">{{ user.role === 'admin' ? 'Administrador' : user.role === 'viewer' ? 'Viewer' : 'Usuario' }}</app-ui-badge></td>
                <td><app-ui-badge [tone]="user.isActive ? 'success' : 'danger'" [dot]="true">{{ user.isActive ? 'Activo' : 'Inactivo' }}</app-ui-badge></td>
                <td>{{ user.updatedAt | date: 'dd/MM/yyyy HH:mm' }}</td>
                <td class="row-actions">
                  <button type="button" class="ui-icon-button ui-icon-button-brand" (click)="startEdit(user)" aria-label="Editar usuario" title="Editar">
                    <app-ui-icon name="edit"></app-ui-icon>
                  </button>
                  <button type="button" class="ui-icon-button ui-icon-button-danger" (click)="deleteUser(user)" [disabled]="isCurrentUser(user)" aria-label="Eliminar usuario" title="Eliminar">
                    <app-ui-icon name="delete"></app-ui-icon>
                  </button>
                </td>
              </tr>
              <tr *ngIf="filteredUsers.length === 0">
                <td colspan="5"><app-ui-state size="sm" title="No se encontraron usuarios."></app-ui-state></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  `,
  styleUrl: './user-management-page.component.css',
})
export class UserManagementPageComponent {
  private readonly userApi = inject(UserManagementApiService);
  readonly authService = inject(AuthService);

  readonly form = new FormBuilder().nonNullable.group({
    email: ['', [Validators.required, Validators.minLength(3), Validators.pattern(/^[a-zA-Z0-9._-]+(?:@inventec\.com)?$/i)]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', Validators.required],
    role: ['user' as UserRole, Validators.required],
    isActive: [true],
  });

  users: ManagedUser[] = [];
  searchTerm = '';
  showForm = false;
  editingUserId: number | null = null;
  isLoading = true;
  isSaving = false;
  formError = '';
  pageError = '';

  constructor() {
    this.loadUsers();
  }

  get filteredUsers(): ManagedUser[] {
    const search = this.searchTerm.trim().toLowerCase();
    if (!search) return this.users;
    return this.users.filter((user) => `${user.email} ${user.role}`.toLowerCase().includes(search));
  }

  get passwordsDoNotMatch(): boolean {
    const password = this.form.controls.password.value;
    const confirmation = this.form.controls.confirmPassword.value;
    return Boolean((password || confirmation) && password !== confirmation && this.form.controls.confirmPassword.touched);
  }

  isInvalid(controlName: 'email' | 'password' | 'confirmPassword'): boolean {
    const control = this.form.controls[controlName];
    return control.invalid && control.touched;
  }

  startCreate(): void {
    this.editingUserId = null;
    this.showForm = true;
    this.formError = '';
    this.setPasswordRequired(true);
    this.form.reset({ email: '', password: '', confirmPassword: '', role: 'user', isActive: true });
  }

  startEdit(user: ManagedUser): void {
    this.editingUserId = user.id;
    this.showForm = true;
    this.formError = '';
    this.setPasswordRequired(false);
    this.form.reset({
      email: this.authService.emailLocalPart(user.email),
      password: '',
      confirmPassword: '',
      role: user.role,
      isActive: user.isActive,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelForm(): void {
    this.showForm = false;
    this.editingUserId = null;
    this.formError = '';
  }

  toggleStatus(): void {
    this.form.controls.isActive.setValue(!this.form.controls.isActive.value);
  }

  saveUser(): void {
    this.formError = '';
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    const value = this.form.getRawValue();
    if (value.password !== value.confirmPassword) {
      this.formError = 'Las contraseñas no coinciden.';
      return;
    }

    const email = `${value.email.split('@')[0]}@inventec.com`;
    const request$ = this.editingUserId
      ? this.userApi.update(this.editingUserId, this.buildUpdatePayload(email, value.password, value.role, value.isActive))
      : this.userApi.create(this.buildCreatePayload(email, value.password, value.role, value.isActive));

    this.isSaving = true;
    request$.pipe(finalize(() => { this.isSaving = false; })).subscribe({
      next: () => {
        this.cancelForm();
        this.loadUsers();
      },
      error: (error: unknown) => { this.formError = this.errorMessage(error, 'No fue posible guardar el usuario.'); },
    });
  }

  deleteUser(user: ManagedUser): void {
    if (this.isCurrentUser(user)) return;
    const confirmed = window.confirm(`¿Estás seguro de eliminar el correo ${user.email}?\n\nEsta acción no se puede deshacer.`);
    if (!confirmed) return;

    this.pageError = '';
    this.userApi.delete(user.id).subscribe({
      next: () => this.loadUsers(),
      error: (error: unknown) => { this.pageError = this.errorMessage(error, 'No fue posible eliminar el usuario.'); },
    });
  }

  isCurrentUser(user: ManagedUser): boolean {
    return this.authService.currentUser()?.id === user.id;
  }

  initials(email: string): string {
    return this.authService.emailLocalPart(email).split(/[._-]+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'U';
  }

  trackByUserId(_index: number, user: ManagedUser): number {
    return user.id;
  }

  private loadUsers(): void {
    this.isLoading = true;
    this.pageError = '';
    this.userApi.getAll().pipe(finalize(() => { this.isLoading = false; })).subscribe({
      next: (users) => { this.users = users; },
      error: (error: unknown) => { this.pageError = this.errorMessage(error, 'No fue posible cargar los usuarios.'); },
    });
  }

  private setPasswordRequired(required: boolean): void {
    this.form.controls.password.setValidators(required ? [Validators.required, Validators.minLength(8)] : [Validators.minLength(8)]);
    this.form.controls.confirmPassword.setValidators(required ? Validators.required : []);
    this.form.controls.password.updateValueAndValidity();
    this.form.controls.confirmPassword.updateValueAndValidity();
  }

  private buildCreatePayload(email: string, password: string, role: UserRole, isActive: boolean): CreateUserPayload {
    return { email, password, role, isActive };
  }

  private buildUpdatePayload(email: string, password: string, role: UserRole, isActive: boolean): UpdateUserPayload {
    const payload: UpdateUserPayload = { email, role, isActive };
    if (password) payload.password = password;
    return payload;
  }

  private errorMessage(error: unknown, fallback: string): string {
    if (!(error instanceof HttpErrorResponse)) return fallback;
    const message = error.error?.message;
    return Array.isArray(message) ? message.join(' ') : (message || fallback);
  }
}
