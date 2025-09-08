import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { provideRouter } from '@angular/router';
import { routes } from './app/app.routes';
import { provideAnimations } from '@angular/platform-browser/animations';
import { importProvidersFrom } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptorFn } from './app/interceptors/auth.interceptor';
import { ConfigService } from './app/services/config.service';
import { inject } from '@angular/core';

async function initializeApp() {
  const configService = inject(ConfigService);
  try {
    await configService.loadConfig();
  } catch (error) {
    console.error('Failed to load app configuration:', error);
    // Return resolved to prevent app from failing to start
  }
}

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes),
    provideAnimations(),
    provideHttpClient(withInterceptors([authInterceptorFn])),
    importProvidersFrom(CommonModule, FormsModule, ReactiveFormsModule),
    {
      provide: 'APP_INITIALIZER',
      useFactory: initializeApp,
      multi: true
    }
  ]
}).catch(err => console.error(err));