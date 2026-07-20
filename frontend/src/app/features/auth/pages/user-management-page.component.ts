import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { AuthService, UserRole } from '../../../core/services/auth.service';
import {
  CreateUserPayload,
  ManagedUser,
  UpdateUserPayload,
  UserManagementApiService,
} from '../../../core/services/user-management-api.service';

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <section class="users-page">
      <header class="page-heading">
        <div>
          <h1>Usuarios</h1>
          <span>Administra las cuentas que pueden ingresar al sistema.</span>
        </div>
        <button type="button" class="primary-button" (click)="startCreate()" *ngIf="!showForm">
          <span aria-hidden="true">＋</span> Agregar usuario
        </button>
      </header>

      <main class="users-content">
        <form class="user-form" [formGroup]="form" (ngSubmit)="saveUser()" *ngIf="showForm" novalidate>
          <div class="form-heading">
            <div>
              <strong>{{ editingUserId ? 'Editar usuario' : 'Nuevo usuario' }}</strong>
              <span>{{ editingUserId ? 'La contraseña solo cambiará si capturas una nueva.' : 'Todos los campos son obligatorios.' }}</span>
            </div>
            <button type="button" class="close-form" (click)="cancelForm()" aria-label="Cerrar formulario">×</button>
          </div>

          <div class="form-grid">
            <label>
              <span>Nombre</span>
              <input type="text" formControlName="displayName" placeholder="Nombre para mostrar" [class.invalid]="isInvalid('displayName')">
            </label>

            <label>
              <span>Usuario</span>
              <input type="text" formControlName="username" autocomplete="off" placeholder="Nombre de usuario" [class.invalid]="isInvalid('username')">
            </label>

            <label>
              <span>{{ editingUserId ? 'Nueva contraseña' : 'Contraseña' }}</span>
              <input type="password" formControlName="password" autocomplete="new-password" [placeholder]="editingUserId ? 'Dejar vacío para conservar' : 'Mínimo 8 caracteres'" [class.invalid]="isInvalid('password')">
            </label>

            <label>
              <span>Confirmar contraseña</span>
              <input type="password" formControlName="confirmPassword" autocomplete="new-password" [placeholder]="editingUserId ? 'Repite la nueva contraseña' : 'Repite la contraseña'" [class.invalid]="isInvalid('confirmPassword') || passwordsDoNotMatch">
            </label>

            <label>
              <span>Rol</span>
              <select formControlName="role">
                <option value="user">Usuario</option>
                <option value="admin">Administrador</option>
              </select>
            </label>

            <label class="status-field">
              <span>Estado</span>
              <button type="button" class="status-toggle" [class.active]="form.controls.isActive.value" (click)="toggleStatus()">
                <span class="toggle-track"><i></i></span>
                {{ form.controls.isActive.value ? 'Activo' : 'Inactivo' }}
              </button>
            </label>
          </div>

          <div class="form-message error" *ngIf="formError">{{ formError }}</div>

          <div class="form-actions">
            <button type="button" class="secondary-button" (click)="cancelForm()">Cancelar</button>
            <button type="submit" class="primary-button" [disabled]="isSaving">
              {{ isSaving ? 'Guardando...' : (editingUserId ? 'Guardar cambios' : 'Crear usuario') }}
            </button>
          </div>
        </form>

        <div class="toolbar">
          <div class="search-box">
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-4-4"></path></svg>
            <input type="search" [value]="searchTerm" (input)="searchTerm = $any($event.target).value" placeholder="Buscar usuario o nombre...">
          </div>
          <span class="record-count">{{ filteredUsers.length }} {{ filteredUsers.length === 1 ? 'registro' : 'registros' }}</span>
        </div>

        <div class="page-message error" *ngIf="pageError">{{ pageError }}</div>
        <div class="loading-state" *ngIf="isLoading">Cargando usuarios...</div>

        <div class="users-table-wrap" *ngIf="!isLoading">
          <table class="users-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Usuario</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>Actualizado</th>
                <th class="actions-column">Opciones</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let user of filteredUsers; trackBy: trackByUserId">
                <td>
                  <div class="user-name">
                    <span class="avatar">{{ initials(user.displayName) }}</span>
                    <div><strong>{{ user.displayName }}</strong><small *ngIf="isCurrentUser(user)">Tu cuenta</small></div>
                  </div>
                </td>
                <td>{{ user.username }}</td>
                <td><span class="role-badge" [class.admin]="user.role === 'admin'">{{ user.role === 'admin' ? 'Administrador' : 'Usuario' }}</span></td>
                <td><span class="status-badge" [class.inactive]="!user.isActive"><i></i>{{ user.isActive ? 'Activo' : 'Inactivo' }}</span></td>
                <td>{{ user.updatedAt | date: 'dd/MM/yyyy HH:mm' }}</td>
                <td class="row-actions">
                  <button type="button" class="icon-button edit" (click)="startEdit(user)" aria-label="Editar usuario" title="Editar">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 20 4.2-1 10.7-10.7-3.2-3.2L5 15.8 4 20Z"></path><path d="m14.7 6.1 3.2 3.2"></path></svg>
                  </button>
                  <button type="button" class="icon-button delete" (click)="deleteUser(user)" [disabled]="isCurrentUser(user)" aria-label="Eliminar usuario" title="Eliminar">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7m4 4v5m4-5v5"></path></svg>
                  </button>
                </td>
              </tr>
              <tr *ngIf="filteredUsers.length === 0">
                <td colspan="6" class="empty-state">No se encontraron usuarios.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </main>
    </section>
  `,
  styles: [`
    :host, .users-page { display: block; min-height: calc(100dvh - 50px); background: #fff; }
    .page-heading { display: flex; align-items: center; justify-content: space-between; gap: 18px; min-height: 58px; padding: 9px 22px; border-bottom: 1px solid var(--border); background: linear-gradient(180deg,#fff 0%,#fbfcfe 100%); }
    .page-heading > div { display: grid; gap: 3px; }
    h1 { margin: 0; color: var(--text); font-size: clamp(1.15rem,1.6vw,1.4rem); font-weight: 800; line-height: 1.1; letter-spacing: -.025em; }
    .page-heading > div > span { color: var(--muted); font-size: .7rem; }
    .users-content { display: grid; gap: 16px; padding: 20px 22px 28px; }
    .primary-button, .secondary-button { display: inline-flex; align-items: center; justify-content: center; gap: 7px; min-height: 36px; padding: 7px 13px; border-radius: 9px; font-size: .73rem; font-weight: 750; cursor: pointer; transition: 150ms ease; }
    .primary-button { border: 1px solid var(--primary); color: #fff; background: var(--primary); box-shadow: 0 7px 16px rgba(22,76,140,.16); }
    .primary-button:hover:not(:disabled) { background: var(--primary-strong); transform: translateY(-1px); }
    .primary-button:disabled { opacity: .6; cursor: wait; }
    .secondary-button { border: 1px solid var(--border); color: #526176; background: #fff; }
    .secondary-button:hover { border-color: #c9d4e1; background: #f8fafc; }
    .user-form { display: grid; gap: 16px; padding: 18px; border: 1px solid #dce4ee; border-radius: 11px; background: #fbfcfe; }
    .form-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
    .form-heading > div { display: grid; gap: 4px; }
    .form-heading strong { color: var(--text); font-size: .9rem; }
    .form-heading span { color: var(--muted); font-size: .69rem; }
    .close-form { width: 30px; height: 30px; border: 0; color: #718096; font-size: 1.25rem; background: transparent; cursor: pointer; }
    .form-grid { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 14px; }
    label { display: grid; align-content: start; gap: 7px; color: #455267; font-size: .7rem; font-weight: 750; }
    input, select { width: 100%; height: 42px; padding: 0 12px; border: 1px solid var(--border); border-radius: 9px; outline: 0; color: var(--text); font-size: .78rem; font-weight: 450; background: #fff; transition: 150ms ease; }
    input:focus, select:focus { border-color: rgba(47,126,199,.7); box-shadow: 0 0 0 3px rgba(47,126,199,.1); }
    input.invalid { border-color: rgba(180,35,58,.68); background: #fffafb; box-shadow: 0 0 0 3px rgba(180,35,58,.07); }
    .status-toggle { display: flex; align-items: center; gap: 9px; width: 100%; height: 42px; padding: 0 12px; border: 1px solid var(--border); border-radius: 9px; color: #68778b; font-size: .76rem; font-weight: 650; background: #fff; cursor: pointer; }
    .toggle-track { position: relative; width: 32px; height: 18px; border-radius: 999px; background: #c7d0dc; transition: 150ms ease; }
    .toggle-track i { position: absolute; top: 3px; left: 3px; width: 12px; height: 12px; border-radius: 50%; background: #fff; transition: 150ms ease; }
    .status-toggle.active { color: #17623b; }
    .status-toggle.active .toggle-track { background: #23945b; }
    .status-toggle.active .toggle-track i { transform: translateX(14px); }
    .form-actions { display: flex; justify-content: flex-end; gap: 9px; }
    .form-message, .page-message { padding: 10px 12px; border-radius: 8px; font-size: .72rem; }
    .error { border: 1px solid rgba(180,35,58,.18); color: #a71d39; background: #fff6f7; }
    .toolbar { display: flex; align-items: center; justify-content: space-between; gap: 14px; }
    .search-box { display: flex; align-items: center; gap: 9px; width: min(460px,100%); height: 40px; padding: 0 12px; border: 1px solid #dce4ee; border-radius: 10px; background: #fbfcfe; }
    .search-box:focus-within { border-color: rgba(47,126,199,.5); background: #fff; box-shadow: 0 0 0 3px rgba(47,126,199,.08); }
    .search-box svg { width: 17px; flex: 0 0 17px; fill: none; stroke: #718096; stroke-linecap: round; stroke-width: 1.7; }
    .search-box input { height: 100%; padding: 0; border: 0; border-radius: 0; background: transparent; box-shadow: none; }
    .record-count { color: #65748a; font-size: .7rem; font-weight: 700; white-space: nowrap; }
    .users-table-wrap { overflow: auto; border: 1px solid #dce4ee; border-radius: 10px; }
    .users-table { width: 100%; border-collapse: collapse; min-width: 820px; }
    th { padding: 11px 14px; border-bottom: 1px solid #dce4ee; color: #65748a; font-size: .65rem; font-weight: 800; text-align: left; text-transform: uppercase; letter-spacing: .055em; background: #f8fafc; }
    td { padding: 12px 14px; border-bottom: 1px solid #edf1f5; color: #344054; font-size: .75rem; vertical-align: middle; }
    tbody tr:last-child td { border-bottom: 0; }
    tbody tr:hover { background: #fbfdff; }
    .user-name { display: flex; align-items: center; gap: 10px; }
    .avatar { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 9px; color: var(--primary); font-size: .65rem; font-weight: 800; background: var(--primary-soft); }
    .user-name > div { display: grid; gap: 2px; }
    .user-name strong { color: var(--text); font-size: .76rem; font-weight: 700; }
    .user-name small { color: var(--primary); font-size: .61rem; font-weight: 650; }
    .role-badge, .status-badge { display: inline-flex; align-items: center; gap: 6px; min-height: 25px; padding: 4px 8px; border-radius: 7px; color: #526176; font-size: .65rem; font-weight: 700; background: #f0f3f7; }
    .role-badge.admin { color: #174c8c; background: #eaf2fb; }
    .status-badge { color: #17623b; background: #ebf8f1; }
    .status-badge i { width: 6px; height: 6px; border-radius: 50%; background: #23945b; }
    .status-badge.inactive { color: #7a4650; background: #f8eef0; }
    .status-badge.inactive i { background: #b4475d; }
    .actions-column { text-align: right; }
    .row-actions { display: flex; justify-content: flex-end; gap: 7px; }
    .icon-button { display: grid; place-items: center; width: 32px; height: 32px; padding: 0; border: 1px solid #dce4ee; border-radius: 8px; background: #fff; cursor: pointer; transition: 150ms ease; }
    .icon-button svg { width: 15px; fill: none; stroke: currentColor; stroke-linecap: round; stroke-linejoin: round; stroke-width: 1.7; }
    .icon-button.edit { color: var(--primary); }
    .icon-button.edit:hover { border-color: rgba(47,126,199,.3); background: var(--primary-soft); }
    .icon-button.delete { color: #b4233a; }
    .icon-button.delete:hover:not(:disabled) { border-color: rgba(180,35,58,.25); background: #fff6f7; }
    .icon-button:disabled { color: #aeb8c5; background: #f5f7f9; cursor: not-allowed; }
    .empty-state, .loading-state { padding: 34px; color: var(--muted); font-size: .75rem; text-align: center; }
    @media (max-width: 900px) { .form-grid { grid-template-columns: repeat(2,minmax(0,1fr)); } }
    @media (max-width: 640px) {
      .page-heading { padding: 9px 12px; }
      .page-heading > div > span { display: none; }
      .users-content { padding: 14px 12px 22px; }
      .form-grid { grid-template-columns: 1fr; }
      .toolbar { align-items: stretch; flex-direction: column; }
      .search-box { width: 100%; }
    }
  `],
})
export class UserManagementPageComponent {
  private readonly userApi = inject(UserManagementApiService);
  readonly authService = inject(AuthService);

  readonly form = new FormBuilder().nonNullable.group({
    displayName: ['', [Validators.required, Validators.minLength(2)]],
    username: ['', [Validators.required, Validators.minLength(3), Validators.pattern(/^[a-zA-Z0-9._-]+$/)]],
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
    return this.users.filter((user) => `${user.displayName} ${user.username} ${user.role}`.toLowerCase().includes(search));
  }

  get passwordsDoNotMatch(): boolean {
    const password = this.form.controls.password.value;
    const confirmation = this.form.controls.confirmPassword.value;
    return Boolean((password || confirmation) && password !== confirmation && this.form.controls.confirmPassword.touched);
  }

  isInvalid(controlName: 'displayName' | 'username' | 'password' | 'confirmPassword'): boolean {
    const control = this.form.controls[controlName];
    return control.invalid && control.touched;
  }

  startCreate(): void {
    this.editingUserId = null;
    this.showForm = true;
    this.formError = '';
    this.setPasswordRequired(true);
    this.form.reset({ displayName: '', username: '', password: '', confirmPassword: '', role: 'user', isActive: true });
  }

  startEdit(user: ManagedUser): void {
    this.editingUserId = user.id;
    this.showForm = true;
    this.formError = '';
    this.setPasswordRequired(false);
    this.form.reset({
      displayName: user.displayName,
      username: user.username,
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

    this.isSaving = true;
    const request$ = this.editingUserId
      ? this.userApi.update(this.editingUserId, this.buildUpdatePayload(value))
      : this.userApi.create(this.buildCreatePayload(value));

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
    const confirmed = window.confirm(`¿Estás seguro de eliminar al usuario ${user.displayName} (${user.username})?\n\nEsta acción no se puede deshacer.`);
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

  initials(name: string): string {
    return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'U';
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

  private buildCreatePayload(value: typeof this.form.value & Record<string, unknown>): CreateUserPayload {
    return {
      displayName: String(value.displayName ?? '').trim(),
      username: String(value.username ?? '').trim(),
      password: String(value.password ?? ''),
      role: value.role as UserRole,
      isActive: Boolean(value.isActive),
    };
  }

  private buildUpdatePayload(value: typeof this.form.value & Record<string, unknown>): UpdateUserPayload {
    const payload: UpdateUserPayload = {
      displayName: String(value.displayName ?? '').trim(),
      username: String(value.username ?? '').trim(),
      role: value.role as UserRole,
      isActive: Boolean(value.isActive),
    };
    const password = String(value.password ?? '');
    if (password) payload.password = password;
    return payload;
  }

  private errorMessage(error: unknown, fallback: string): string {
    if (!(error instanceof HttpErrorResponse)) return fallback;
    const message = error.error?.message;
    return Array.isArray(message) ? message.join(' ') : (message || fallback);
  }
}
