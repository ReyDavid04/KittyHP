import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { UiAlertComponent } from '../../../shared/ui';

type AccessMode = 'login' | 'register' | 'forgot';

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, UiAlertComponent],
  template: `
    <div class="login-page">
      <section class="login-panel ui-card">
        <div class="login-brand">
          <img src="assets/laptop-repair.svg" alt="">
          <div>
            <strong>KittyHP</strong>
            <span>Reportes de reparación</span>
          </div>
        </div>

        <div class="login-heading">
          <span>{{ mode === 'login' ? 'Acceso al sistema' : (mode === 'register' ? 'Nueva cuenta' : 'Recuperación') }}</span>
          <h1 class="ui-display-title">{{ pageTitle }}</h1>
          <p>{{ pageDescription }}</p>
        </div>

        <form *ngIf="mode === 'login'" [formGroup]="loginForm" (ngSubmit)="submitLogin()" novalidate>
          <label class="ui-field">
            <span>Correo</span>
            <div class="input-shell email-shell ui-control" [class.invalid]="isInvalid(loginForm, 'email')">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16v12H4V6Zm0 1 8 6 8-6"></path></svg>
              <input type="text" formControlName="email" autocomplete="username" placeholder="Apellido.Nombre" [attr.aria-invalid]="isInvalid(loginForm, 'email')">
              <span class="email-suffix">&#64;inventec.com</span>
            </div>
          </label>

          <label class="ui-field">
            <span class="label-row"><span>Contraseña</span><a routerLink="/forgot-password">¿La olvidaste?</a></span>
            <div class="input-shell ui-control" [class.invalid]="isInvalid(loginForm, 'password')">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10V8a5 5 0 0 1 10 0v2m-11 0h12v10H6V10Z"></path></svg>
              <input [type]="showPassword ? 'text' : 'password'" formControlName="password" autocomplete="current-password" placeholder="Ingresa tu contraseña" [attr.aria-invalid]="isInvalid(loginForm, 'password')">
              <button type="button" class="password-toggle ui-input-action" (click)="showPassword = !showPassword" [attr.aria-label]="showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'" [attr.aria-pressed]="showPassword">
                <svg *ngIf="!showPassword" viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"></path><circle cx="12" cy="12" r="2.5"></circle></svg>
                <svg *ngIf="showPassword" viewBox="0 0 24 24" aria-hidden="true"><path d="m3 3 18 18M10.6 6.2A9.8 9.8 0 0 1 12 6c6 0 9.5 6 9.5 6a16 16 0 0 1-2.2 2.8M6.2 6.2C3.8 8 2.5 12 2.5 12s3.5 6 9.5 6a9 9 0 0 0 3.2-.6M9.9 9.9a3 3 0 0 0 4.2 4.2"></path></svg>
              </button>
            </div>
          </label>

          <ng-container *ngTemplateOutlet="messages"></ng-container>

          <button type="submit" class="login-button ui-button ui-button-primary" [disabled]="isSubmitting">
            <span>{{ isSubmitting ? 'Ingresando...' : 'Ingresar' }}</span>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6"></path></svg>
          </button>

          <div class="access-footer">¿No tienes una cuenta? <a routerLink="/register">Registrarse</a></div>
        </form>

        <form *ngIf="mode === 'register'" [formGroup]="registrationCodeSent ? registrationCodeForm : registrationForm" (ngSubmit)="submitRegistration()" novalidate>
          <ng-container *ngIf="!registrationCodeSent">
          <label class="ui-field">
              <span>Correo corporativo</span>
              <div class="input-shell email-shell ui-control" [class.invalid]="isInvalid(registrationForm, 'email')">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16v12H4V6Zm0 1 8 6 8-6"></path></svg>
                <input type="text" formControlName="email" autocomplete="username" placeholder="Apellido.Nombre" [attr.aria-invalid]="isInvalid(registrationForm, 'email')">
                <span class="email-suffix">&#64;inventec.com</span>
              </div>
            </label>

          <label class="ui-field">
              <span>Contraseña</span>
              <div class="input-shell ui-control" [class.invalid]="isInvalid(registrationForm, 'password')">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10V8a5 5 0 0 1 10 0v2m-11 0h12v10H6V10Z"></path></svg>
                <input [type]="showPassword ? 'text' : 'password'" formControlName="password" autocomplete="new-password" placeholder="Mínimo 8 caracteres" [attr.aria-invalid]="isInvalid(registrationForm, 'password')">
                <button type="button" class="password-toggle ui-input-action" (click)="showPassword = !showPassword" aria-label="Mostrar u ocultar contraseña" [attr.aria-pressed]="showPassword">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"></path><circle cx="12" cy="12" r="2.5"></circle></svg>
                </button>
              </div>
            </label>

          <label class="ui-field">
              <span>Confirmar contraseña</span>
              <div class="input-shell ui-control" [class.invalid]="isInvalid(registrationForm, 'confirmPassword') || registrationPasswordsDoNotMatch">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10V8a5 5 0 0 1 10 0v2m-11 0h12v10H6V10Z"></path></svg>
                <input [type]="showPassword ? 'text' : 'password'" formControlName="confirmPassword" autocomplete="new-password" placeholder="Repite la contraseña" [attr.aria-invalid]="isInvalid(registrationForm, 'confirmPassword') || registrationPasswordsDoNotMatch">
              </div>
            </label>
          </ng-container>

          <ng-container *ngIf="registrationCodeSent">
            <div class="sent-to">Código enviado a <strong>{{ registrationEmail }}&#64;inventec.com</strong></div>
          <label class="ui-field">
              <span>Código de verificación</span>
              <div class="input-shell code-shell ui-control" [class.invalid]="isInvalid(registrationCodeForm, 'code')">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 12h8M8 8h8M8 16h5M5 3h14v18H5V3Z"></path></svg>
                <input type="text" inputmode="numeric" maxlength="6" formControlName="code" autocomplete="one-time-code" placeholder="000000" [attr.aria-invalid]="isInvalid(registrationCodeForm, 'code')">
              </div>
            </label>
          </ng-container>

          <ng-container *ngTemplateOutlet="messages"></ng-container>

          <button type="submit" class="login-button ui-button ui-button-primary" [disabled]="isSubmitting">
            <span>{{ isSubmitting ? 'Procesando...' : (registrationCodeSent ? 'Verificar y crear cuenta' : 'Enviar código') }}</span>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6"></path></svg>
          </button>

          <button *ngIf="registrationCodeSent" type="button" class="text-button ui-button ui-button-ghost" (click)="restartRegistration()">Cambiar correo</button>
          <div class="access-footer">¿Ya tienes cuenta? <a routerLink="/login">Iniciar sesión</a></div>
        </form>

        <form *ngIf="mode === 'forgot'" [formGroup]="recoveryCodeSent ? resetPasswordForm : recoveryEmailForm" (ngSubmit)="submitRecovery()" novalidate>
          <ng-container *ngIf="!recoveryCodeSent">
          <label class="ui-field">
              <span>Correo corporativo</span>
              <div class="input-shell email-shell ui-control" [class.invalid]="isInvalid(recoveryEmailForm, 'email')">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16v12H4V6Zm0 1 8 6 8-6"></path></svg>
                <input type="text" formControlName="email" autocomplete="username" placeholder="Apellido.Nombre" [attr.aria-invalid]="isInvalid(recoveryEmailForm, 'email')">
                <span class="email-suffix">&#64;inventec.com</span>
              </div>
            </label>
          </ng-container>

          <ng-container *ngIf="recoveryCodeSent">
            <div class="sent-to">Código enviado a <strong>{{ recoveryEmail }}&#64;inventec.com</strong></div>
          <label class="ui-field">
              <span>Código de recuperación</span>
              <div class="input-shell code-shell ui-control" [class.invalid]="isInvalid(resetPasswordForm, 'code')">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 12h8M8 8h8M8 16h5M5 3h14v18H5V3Z"></path></svg>
                <input type="text" inputmode="numeric" maxlength="6" formControlName="code" autocomplete="one-time-code" placeholder="000000" [attr.aria-invalid]="isInvalid(resetPasswordForm, 'code')">
              </div>
            </label>

          <label class="ui-field">
              <span>Nueva contraseña</span>
              <div class="input-shell ui-control" [class.invalid]="isInvalid(resetPasswordForm, 'password')">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10V8a5 5 0 0 1 10 0v2m-11 0h12v10H6V10Z"></path></svg>
                <input [type]="showPassword ? 'text' : 'password'" formControlName="password" autocomplete="new-password" placeholder="Mínimo 8 caracteres" [attr.aria-invalid]="isInvalid(resetPasswordForm, 'password')">
                <button type="button" class="password-toggle ui-input-action" (click)="showPassword = !showPassword" aria-label="Mostrar u ocultar contraseña" [attr.aria-pressed]="showPassword">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"></path><circle cx="12" cy="12" r="2.5"></circle></svg>
                </button>
              </div>
            </label>

          <label class="ui-field">
              <span>Confirmar contraseña</span>
              <div class="input-shell ui-control" [class.invalid]="isInvalid(resetPasswordForm, 'confirmPassword') || resetPasswordsDoNotMatch">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10V8a5 5 0 0 1 10 0v2m-11 0h12v10H6V10Z"></path></svg>
                <input [type]="showPassword ? 'text' : 'password'" formControlName="confirmPassword" autocomplete="new-password" placeholder="Repite la contraseña" [attr.aria-invalid]="isInvalid(resetPasswordForm, 'confirmPassword') || resetPasswordsDoNotMatch">
              </div>
            </label>
          </ng-container>

          <ng-container *ngTemplateOutlet="messages"></ng-container>

          <button type="submit" class="login-button ui-button ui-button-primary" [disabled]="isSubmitting">
            <span>{{ isSubmitting ? 'Procesando...' : (recoveryCodeSent ? 'Cambiar contraseña' : 'Enviar código') }}</span>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6"></path></svg>
          </button>

          <button *ngIf="recoveryCodeSent" type="button" class="text-button ui-button ui-button-ghost" (click)="restartRecovery()">Cambiar correo</button>
          <div class="access-footer"><a routerLink="/login">Volver a iniciar sesión</a></div>
        </form>

        <ng-template #messages>
          <app-ui-alert class="login-message" *ngIf="successMessage" tone="success">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"></path></svg>
            <span>{{ successMessage }}</span>
          </app-ui-alert>
          <app-ui-alert class="login-message" *ngIf="developmentCode" tone="warning">
            Código de desarrollo: <strong>{{ developmentCode }}</strong>
          </app-ui-alert>
          <app-ui-alert class="login-message" *ngIf="errorMessage" tone="danger">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8v5m0 3h.01M10.3 4.8 2.7 18a2 2 0 0 0 1.7 3h15.2a2 2 0 0 0 1.7-3L13.7 4.8a2 2 0 0 0-3.4 0Z"></path></svg>
            <span>{{ errorMessage }}</span>
          </app-ui-alert>
        </ng-template>
      </section>

      <aside class="login-visual" aria-hidden="true">
        <div>
          <svg viewBox="0 0 64 64"><rect x="12" y="12" width="40" height="28" rx="4"></rect><path d="M7 46h50l-4 6H11l-4-6Z"></path><path d="m35 19-9 12h7l-4 10 12-15h-7l1-7Z"></path></svg>
        </div>
        <strong>Control de fallas y reparaciones</strong>
        <span>Información centralizada para dar seguimiento a cada reporte.</span>
      </aside>
    </div>
  `,
  styleUrl: './login-page.component.css',
})
export class LoginPageComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly emailValidators = [Validators.required, Validators.pattern(/^[a-zA-Z0-9._-]+(?:@inventec\.com)?$/i)];

  readonly loginForm = new FormBuilder().nonNullable.group({
    email: ['', this.emailValidators],
    password: ['', Validators.required],
  });

  readonly registrationForm = new FormBuilder().nonNullable.group({
    email: ['', this.emailValidators],
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', Validators.required],
  });

  readonly registrationCodeForm = new FormBuilder().nonNullable.group({
    code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
  });

  readonly recoveryEmailForm = new FormBuilder().nonNullable.group({
    email: ['', this.emailValidators],
  });

  readonly resetPasswordForm = new FormBuilder().nonNullable.group({
    code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', Validators.required],
  });

  showPassword = false;
  isSubmitting = false;
  errorMessage = '';
  successMessage = '';
  developmentCode = '';
  registrationCodeSent = false;
  recoveryCodeSent = false;
  registrationEmail = '';
  recoveryEmail = '';

  constructor() {
    this.successMessage = this.route.snapshot.queryParamMap.get('message') ?? '';
  }

  get mode(): AccessMode {
    const routeMode = this.route.snapshot.data['mode'];
    return routeMode === 'register' || routeMode === 'forgot' ? routeMode : 'login';
  }

  get pageTitle(): string {
    if (this.mode === 'register') return this.registrationCodeSent ? 'Verificar correo' : 'Crear cuenta';
    if (this.mode === 'forgot') return this.recoveryCodeSent ? 'Nueva contraseña' : 'Recuperar contraseña';
    return 'Iniciar sesión';
  }

  get pageDescription(): string {
    if (this.mode === 'register') return this.registrationCodeSent
      ? 'Captura el código de seis dígitos que enviamos a tu correo.'
      : 'Regístrate utilizando tu correo corporativo de Inventec.';
    if (this.mode === 'forgot') return this.recoveryCodeSent
      ? 'Captura el código recibido y define una contraseña nueva.'
      : 'Te enviaremos un código para confirmar el cambio de contraseña.';
    return 'Ingresa tu correo corporativo y contraseña para continuar.';
  }

  get registrationPasswordsDoNotMatch(): boolean {
    const value = this.registrationForm.getRawValue();
    return Boolean(value.confirmPassword && value.password !== value.confirmPassword && this.registrationForm.controls.confirmPassword.touched);
  }

  get resetPasswordsDoNotMatch(): boolean {
    const value = this.resetPasswordForm.getRawValue();
    return Boolean(value.confirmPassword && value.password !== value.confirmPassword && this.resetPasswordForm.controls.confirmPassword.touched);
  }

  isInvalid(form: { controls: Record<string, { invalid: boolean; touched: boolean }> }, controlName: string): boolean {
    const control = form.controls[controlName];
    return Boolean(control?.invalid && control.touched);
  }

  submitLogin(): void {
    this.clearMessages();
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    const value = this.loginForm.getRawValue();
    this.runRequest(
      this.authService.login(value.email.trim(), value.password),
      () => {
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/';
        void this.router.navigateByUrl(returnUrl);
      },
      'No fue posible iniciar sesión.',
    );
  }

  submitRegistration(): void {
    this.clearMessages();

    if (!this.registrationCodeSent) {
      this.registrationForm.markAllAsTouched();
      if (this.registrationForm.invalid || this.registrationPasswordsDoNotMatch) {
        if (this.registrationPasswordsDoNotMatch) this.errorMessage = 'Las contraseñas no coinciden.';
        return;
      }

      const value = this.registrationForm.getRawValue();
      this.runRequest(
        this.authService.register(value.email.trim(), value.password),
        (response) => {
          this.registrationEmail = value.email.split('@')[0];
          this.registrationCodeSent = true;
          this.successMessage = response.message;
          this.developmentCode = response.developmentCode ?? '';
        },
        'No fue posible iniciar el registro.',
      );
      return;
    }

    this.registrationCodeForm.markAllAsTouched();
    if (this.registrationCodeForm.invalid) return;
    const code = this.registrationCodeForm.controls.code.value;
    this.runRequest(
      this.authService.verifyRegistration(this.registrationEmail, code),
      (response) => void this.router.navigate(['/login'], { queryParams: { message: response.message } }),
      'No fue posible verificar el correo.',
    );
  }

  submitRecovery(): void {
    this.clearMessages();

    if (!this.recoveryCodeSent) {
      this.recoveryEmailForm.markAllAsTouched();
      if (this.recoveryEmailForm.invalid) return;
      const email = this.recoveryEmailForm.controls.email.value.trim();
      this.runRequest(
        this.authService.requestPasswordReset(email),
        (response) => {
          this.recoveryEmail = email.split('@')[0];
          this.recoveryCodeSent = true;
          this.successMessage = response.message;
          this.developmentCode = response.developmentCode ?? '';
        },
        'No fue posible solicitar el cambio de contraseña.',
      );
      return;
    }

    this.resetPasswordForm.markAllAsTouched();
    if (this.resetPasswordForm.invalid || this.resetPasswordsDoNotMatch) {
      if (this.resetPasswordsDoNotMatch) this.errorMessage = 'Las contraseñas no coinciden.';
      return;
    }

    const value = this.resetPasswordForm.getRawValue();
    this.runRequest(
      this.authService.resetPassword(this.recoveryEmail, value.code, value.password),
      (response) => void this.router.navigate(['/login'], { queryParams: { message: response.message } }),
      'No fue posible cambiar la contraseña.',
    );
  }

  restartRegistration(): void {
    this.registrationCodeSent = false;
    this.registrationCodeForm.reset();
    this.clearMessages();
  }

  restartRecovery(): void {
    this.recoveryCodeSent = false;
    this.resetPasswordForm.reset();
    this.clearMessages();
  }

  private runRequest<T>(request$: import('rxjs').Observable<T>, onSuccess: (response: T) => void, fallback: string): void {
    this.isSubmitting = true;
    request$.pipe(finalize(() => { this.isSubmitting = false; })).subscribe({
      next: onSuccess,
      error: (error: unknown) => { this.errorMessage = this.extractError(error, fallback); },
    });
  }

  private clearMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
    this.developmentCode = '';
  }

  private extractError(error: unknown, fallback: string): string {
    if (!(error instanceof HttpErrorResponse)) return fallback;
    const message = error.error?.message;
    return Array.isArray(message) ? message.join(' ') : (message || fallback);
  }
}
