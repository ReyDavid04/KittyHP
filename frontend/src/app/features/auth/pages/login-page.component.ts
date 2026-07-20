import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <main class="login-page">
      <section class="login-panel">
        <div class="login-brand">
          <img src="assets/laptop-repair.svg" alt="">
          <div>
            <strong>KittyHP</strong>
            <span>Reportes de reparación</span>
          </div>
        </div>

        <div class="login-heading">
          <span>Acceso al sistema</span>
          <h1>Iniciar sesión</h1>
          <p>Ingresa tu correo corporativo y contraseña para continuar.</p>
        </div>

        <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <label>
            <span>Correo</span>
            <div class="input-shell email-shell" [class.invalid]="isInvalid('email')">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16v12H4V6Zm0 1 8 6 8-6"></path></svg>
              <input type="text" formControlName="email" autocomplete="username" placeholder="Ramos.Rey">
              <span class="email-suffix">&#64;inventec.com</span>
            </div>
          </label>

          <label>
            <span>Contraseña</span>
            <div class="input-shell" [class.invalid]="isInvalid('password')">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10V8a5 5 0 0 1 10 0v2m-11 0h12v10H6V10Z"></path></svg>
              <input [type]="showPassword ? 'text' : 'password'" formControlName="password" autocomplete="current-password" placeholder="Ingresa tu contraseña">
              <button type="button" class="password-toggle" (click)="showPassword = !showPassword" [attr.aria-label]="showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'">
                <svg *ngIf="!showPassword" viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"></path><circle cx="12" cy="12" r="2.5"></circle></svg>
                <svg *ngIf="showPassword" viewBox="0 0 24 24" aria-hidden="true"><path d="m3 3 18 18M10.6 6.2A9.8 9.8 0 0 1 12 6c6 0 9.5 6 9.5 6a16 16 0 0 1-2.2 2.8M6.2 6.2C3.8 8 2.5 12 2.5 12s3.5 6 9.5 6a9 9 0 0 0 3.2-.6M9.9 9.9a3 3 0 0 0 4.2 4.2"></path></svg>
              </button>
            </div>
          </label>

          <div class="login-error" *ngIf="errorMessage" role="alert">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8v5m0 3h.01M10.3 4.8 2.7 18a2 2 0 0 0 1.7 3h15.2a2 2 0 0 0 1.7-3L13.7 4.8a2 2 0 0 0-3.4 0Z"></path></svg>
            <span>{{ errorMessage }}</span>
          </div>

          <button type="submit" class="login-button" [disabled]="isSubmitting">
            <span>{{ isSubmitting ? 'Ingresando...' : 'Ingresar' }}</span>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6"></path></svg>
          </button>
        </form>
      </section>

      <aside class="login-visual" aria-hidden="true">
        <div class="visual-icon">
          <svg viewBox="0 0 64 64"><rect x="12" y="12" width="40" height="28" rx="4"></rect><path d="M7 46h50l-4 6H11l-4-6Z"></path><path d="m35 19-9 12h7l-4 10 12-15h-7l1-7Z"></path></svg>
        </div>
        <strong>Control de fallas y reparaciones</strong>
        <span>Información centralizada para dar seguimiento a cada reporte.</span>
      </aside>
    </main>
  `,
  styles: [`
    :host { display: block; min-height: 100dvh; background: #edf3f9; }
    .login-page { display: grid; grid-template-columns: minmax(360px, 520px) minmax(360px, 1fr); min-height: 100dvh; }
    .login-panel { display: flex; flex-direction: column; justify-content: center; padding: clamp(34px, 6vw, 82px); background: #fff; }
    .login-brand { position: absolute; top: 28px; left: clamp(34px, 6vw, 82px); display: flex; align-items: center; gap: 10px; }
    .login-brand img { width: 36px; height: 36px; }
    .login-brand div { display: grid; gap: 2px; }
    .login-brand strong { color: var(--text); font-size: .92rem; }
    .login-brand span { color: var(--muted); font-size: .65rem; }
    .login-heading { display: grid; gap: 9px; margin-bottom: 28px; }
    .login-heading > span { color: var(--primary); font-size: .68rem; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
    h1 { margin: 0; color: var(--text); font-size: clamp(1.7rem, 3vw, 2.25rem); line-height: 1.05; letter-spacing: -.04em; }
    .login-heading p { max-width: 420px; margin: 0; color: var(--muted); font-size: .8rem; line-height: 1.55; }
    form { display: grid; gap: 18px; }
    label { display: grid; gap: 8px; color: #455267; font-size: .72rem; font-weight: 750; }
    .input-shell { display: flex; align-items: center; gap: 10px; height: 48px; padding: 0 13px; border: 1px solid var(--border); border-radius: 10px; background: #f8fafc; transition: 150ms ease; }
    .input-shell:focus-within { border-color: rgba(47,126,199,.7); background: #fff; box-shadow: 0 0 0 3px rgba(47,126,199,.1); }
    .input-shell.invalid { border-color: rgba(180,35,58,.65); background: #fffafb; }
    .input-shell > svg { width: 18px; flex: 0 0 18px; fill: none; stroke: #708096; stroke-linecap: round; stroke-linejoin: round; stroke-width: 1.7; }
    input { min-width: 0; flex: 1; height: 100%; border: 0; outline: 0; color: var(--text); font: inherit; font-size: .8rem; font-weight: 450; background: transparent; }
    input::placeholder { color: #9ba7b6; }
    .email-shell { gap: 8px; }
    .email-suffix { flex: 0 0 auto; color: #66758a; font-size: .78rem; font-weight: 600; }
    .password-toggle { display: grid; place-items: center; width: 30px; height: 30px; padding: 0; border: 0; color: #708096; background: transparent; cursor: pointer; }
    .password-toggle svg { width: 18px; fill: none; stroke: currentColor; stroke-linecap: round; stroke-linejoin: round; stroke-width: 1.65; }
    .login-error { display: flex; align-items: center; gap: 8px; padding: 10px 12px; border: 1px solid rgba(180,35,58,.18); border-radius: 9px; color: #a71d39; font-size: .72rem; background: #fff6f7; }
    .login-error svg { width: 17px; flex: 0 0 17px; fill: none; stroke: currentColor; stroke-linecap: round; stroke-linejoin: round; stroke-width: 1.7; }
    .login-button { display: flex; align-items: center; justify-content: center; gap: 8px; min-height: 46px; margin-top: 2px; border: 1px solid var(--primary); border-radius: 10px; color: #fff; font-size: .78rem; font-weight: 750; background: var(--primary); box-shadow: 0 10px 22px rgba(22,76,140,.2); cursor: pointer; transition: 150ms ease; }
    .login-button:hover:not(:disabled) { background: var(--primary-strong); transform: translateY(-1px); }
    .login-button:disabled { opacity: .68; cursor: wait; }
    .login-button svg { width: 17px; fill: none; stroke: currentColor; stroke-linecap: round; stroke-linejoin: round; stroke-width: 1.8; }
    .login-visual { display: grid; place-content: center; justify-items: center; gap: 14px; padding: 48px; color: #fff; text-align: center; background: radial-gradient(circle at 30% 25%,rgba(75,151,220,.55),transparent 30%),linear-gradient(145deg,#102e52,#174c8c 55%,#236cae); }
    .visual-icon { display: grid; place-items: center; width: 120px; height: 120px; margin-bottom: 8px; border: 1px solid rgba(255,255,255,.22); border-radius: 32px; background: rgba(255,255,255,.1); box-shadow: 0 24px 60px rgba(5,24,48,.28); backdrop-filter: blur(12px); }
    .visual-icon svg { width: 70px; fill: none; stroke: #fff; stroke-linecap: round; stroke-linejoin: round; stroke-width: 2.3; }
    .login-visual strong { font-size: 1.15rem; font-weight: 700; }
    .login-visual > span { max-width: 390px; color: rgba(255,255,255,.72); font-size: .76rem; line-height: 1.6; }
    @media (max-width: 820px) {
      .login-page { grid-template-columns: 1fr; }
      .login-visual { display: none; }
      .login-panel { min-height: 100dvh; padding: 88px 24px 36px; }
      .login-brand { top: 22px; left: 24px; }
    }
  `],
})
export class LoginPageComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly form = new FormBuilder().nonNullable.group({
    email: ['', [Validators.required, Validators.pattern(/^[a-zA-Z0-9._-]+(?:@inventec\.com)?$/i)]],
    password: ['', Validators.required],
  });

  showPassword = false;
  isSubmitting = false;
  errorMessage = '';

  isInvalid(controlName: 'email' | 'password'): boolean {
    const control = this.form.controls[controlName];
    return control.invalid && control.touched;
  }

  submit(): void {
    this.errorMessage = '';
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    const value = this.form.getRawValue();
    this.authService.login(value.email.trim(), value.password).pipe(
      finalize(() => { this.isSubmitting = false; }),
    ).subscribe({
      next: () => {
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/';
        void this.router.navigateByUrl(returnUrl);
      },
      error: (error: unknown) => {
        this.errorMessage = error instanceof HttpErrorResponse
          ? (error.error?.message || 'No fue posible iniciar sesión.')
          : 'No fue posible iniciar sesión.';
      },
    });
  }
}
