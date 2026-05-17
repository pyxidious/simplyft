import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.token;
  const request = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;
  return next(request).pipe(
    catchError((error) => {
      if (error.status === 401 && !req.url.includes('/api/auth/login')) {
        localStorage.removeItem('simplyft-auth-token');
        auth.currentUser.set(null);
      }
      return throwError(() => error);
    })
  );
};
