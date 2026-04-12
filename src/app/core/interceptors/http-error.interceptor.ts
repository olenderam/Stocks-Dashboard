import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { MessageService } from 'primeng/api';
import { mapHttpErrorMessage } from '../utils/http-error.util';

export const httpErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const messageService = inject(MessageService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      const message = mapHttpErrorMessage(error);

      const shouldShowToast = error.status === 0 || error.status === 429 || error.status >= 500;

      if (shouldShowToast) {
        messageService.add({
          severity: 'error',
          summary: 'Błąd',
          detail: message,
        });
      }

      return throwError(() => error);
    }),
  );
};
