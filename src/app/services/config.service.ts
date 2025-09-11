import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { map, catchError, shareReplay } from 'rxjs/operators';
import { IAppConfig, IConfigFile, Environment } from '../config/app-config.interface';

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  private readonly CONFIG_PATH = '/assets/config/app.config.json';
  private configSubject = new BehaviorSubject<IAppConfig | null>(null);
  private configCache$: Observable<IConfigFile> | null = null;
  private currentEnvironment: Environment = 'development';

  public readonly config$ = this.configSubject.asObservable();

  constructor(private http: HttpClient) {
    this.setEnvironment();
    // Config will be loaded on first access
  }

  private setEnvironment(): void {
    const hostname = window.location.hostname;
    
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      this.currentEnvironment = 'development';
    } else if (hostname.includes('https://hcoaccreditationtest.nabh.co')) {
      this.currentEnvironment = 'staging';  
    } else {
      this.currentEnvironment = 'production';
    }
  }

  private loadConfigFile(): Observable<IConfigFile> {
    if (!this.configCache$) {
      this.configCache$ = this.http.get<IConfigFile>(this.CONFIG_PATH).pipe(
        shareReplay(1),
        catchError(error => {
          console.error('Failed to load config file:', error);
          return throwError(() => new Error('Configuration could not be loaded'));
        })
      );
    }
    return this.configCache$;
  }

  public loadConfig(): Promise<IAppConfig> {
    return new Promise((resolve, reject) => {
      this.loadConfigFile().pipe(
        map(configFile => configFile[this.currentEnvironment])
      ).subscribe({
        next: (config) => {
          this.configSubject.next(config);
          resolve(config);
        },
        error: (error) => {
          console.error('Error loading configuration:', error);
          reject(error);
        }
      });
    });
  }

  public getConfig(): IAppConfig | null {
    return this.configSubject.value;
  }

  public getConfigAsync(): Promise<IAppConfig> {
    const currentConfig = this.configSubject.value;
    if (currentConfig) {
      return Promise.resolve(currentConfig);
    }
    return this.loadConfig();
  }

  public getApiUrl(): string {
    const config = this.getConfig();
    if (!config) {
      // Fallback to localhost during initialization
      return 'http://localhost:5052/api';
    }
    return config.apiUrl;
  }

  
  public getFullApiUrl(endpoint: string): string {
    return `${this.getApiUrl()}/${endpoint.replace(/^\//, '')}`;
  }

  public getCurrentEnvironment(): Environment {
    return this.currentEnvironment;
  }

  public isProduction(): boolean {
    return this.currentEnvironment === 'production';
  }

  public isDevelopment(): boolean {
    return this.currentEnvironment === 'development';
  }

 
}