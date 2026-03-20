import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  return next(req).pipe(
    catchError(err => {
      // Only auto-logout on 401 after the app is fully initialized.
      // During APP_INITIALIZER (restoreSession), restoreSession handles the error itself.
      if (err.status === 401 && auth.initialized()) {
        auth.logout();
      }
      return throwError(() => err);
    })
  );
};
