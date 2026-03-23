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
      // Only auto-logout if the user was actually logged in (token expired/revoked).
      // Don't redirect unauthenticated users making public API calls.
      if (err.status === 401 && auth.initialized() && auth.isLoggedIn()) {
        auth.logout();
      }
      return throwError(() => err);
    })
  );
};
