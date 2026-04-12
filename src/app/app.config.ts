import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { providePrimeNG } from 'primeng/config';
import Aura from '@primeuix/themes/aura';
import { provideAnimations } from '@angular/platform-browser/animations';
import { MessageService } from 'primeng/api';
import { httpErrorInterceptor } from '@core/interceptors/http-error.interceptor';
import { API_BASE_URL } from '@core/tokens/api-base-url.token';
import { WS_URL } from '@core/tokens/ws-url.token';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([httpErrorInterceptor])),
    provideAnimations(), // deprecated in Angular 20+, required for PrimeNG dialog compability
    providePrimeNG({
      theme: {
        preset: Aura,
      },
      ripple: true,
    }),
    {
      provide: API_BASE_URL,
      useValue: 'http://207.154.219.113:3000',
    },
    {
      provide: WS_URL,
      useValue: 'ws://207.154.219.113:3000/ws',
    },
    MessageService,
  ],
};
