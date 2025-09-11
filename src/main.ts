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

function initializeAppFactory(configService: ConfigService) {
  return async () => {
    try {
      await configService.loadConfig();
      console.log('App configuration loaded successfully');
    } catch (error) {
      console.error('Failed to load app configuration:', error);
      // Continue app startup even if config fails
    }
  };
}

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes),
    provideAnimations(),
    provideHttpClient(withInterceptors([authInterceptorFn])),
    importProvidersFrom(CommonModule, FormsModule, ReactiveFormsModule),
    ConfigService,
    {
      provide: 'APP_INITIALIZER',
      useFactory: initializeAppFactory,
      deps: [ConfigService],
      multi: true
    }
  ]
}).catch(err => console.error(err));