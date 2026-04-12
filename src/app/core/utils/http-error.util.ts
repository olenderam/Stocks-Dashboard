import { HttpErrorResponse } from '@angular/common/http';

export function mapHttpErrorMessage(error: HttpErrorResponse): string {
  if (error.status === 0) {
    return 'Nie udało się połączyć z serwerem.';
  }

  if (error.status === 400) {
    return error.error?.message ?? 'Nieprawidłowe dane.';
  }

  if (error.status === 429) {
    return 'Przekroczono limit zapytań. Spróbuj ponownie później.';
  }

  if (error.status >= 500) {
    return 'Wewnętrzny błąd serwera.';
  }

  return 'Wystąpił nieoczekiwany błąd.';
}
