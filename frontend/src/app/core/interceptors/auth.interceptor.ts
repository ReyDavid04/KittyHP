import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { apiUrl } from '../config/api.config';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const token = authService.getToken();
  const apiRequest = request.url.startsWith('/api/')
    ? request.clone({ url: apiUrl(request.url) })
    : request;
  const authenticatedRequest = token
    ? apiRequest.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : apiRequest;

  return next(authenticatedRequest).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401 && !request.url.includes('/api/auth/login')) {
        authService.logout();
        void router.navigate(['/login']);
      }
      return throwError(() => error);
    }),
  );
};
