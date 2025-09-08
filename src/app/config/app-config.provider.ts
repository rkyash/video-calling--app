import { inject } from '@angular/core';
import { ConfigService } from '../services/config.service';

export function provideAppConfig() {
  return {
    provide: 'APP_CONFIG_INITIALIZER',
    useFactory: () => {
      const configService = inject(ConfigService);
      return () => configService.loadConfig();
    },
    multi: true
  };
}

export function initializeAppConfig() {
  const configService = inject(ConfigService);
  return configService.loadConfig();
}