import { Injectable, inject } from '@angular/core';
import { 
  HttpInterceptor, 
  HttpRequest, 
  HttpHandler, 
  HttpEvent, 
  HttpErrorResponse,
  HttpHandlerFn
} from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, switchMap, filter, take } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { JwtTokenService } from '../services/jwt-token.service';
import { ConfigService } from '../services/config.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private isRefreshing = false;
  private refreshTokenSubject: BehaviorSubject<string | null> = new BehaviorSubject<string | null>(null);

  constructor(
    private authService: AuthService,
    private jwtService: JwtTokenService,
    private configService: ConfigService
  ) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Skip auth for certain endpoints
    if (this.shouldSkipAuth(req.url)) {
      return next.handle(req);
    }

    // Add auth token to request
    const authReq = this.addAuthHeader(req);
    
    return next.handle(authReq).pipe(
      catchError(error => {
        if (error instanceof HttpErrorResponse && error.status === 401) {
          return this.handle401Error(authReq, next);
        }
        return throwError(() => error);
      })
    );
  }

  /**
   * Add authorization header to request
   */
  private addAuthHeader(req: HttpRequest<any>): HttpRequest<any> {
    const token = this.authService.getToken();
    
    if (token && !this.jwtService.isTokenExpired(token)) {
      return req.clone({
        setHeaders: {
          'Authorization': `Bearer ${token}`,
          'X-Request-ID': this.generateRequestId(),
          'X-API-Version': this.configService.getConfig()?.version || '1.0.0'
        }
      });
    }

    return req;
  }

  /**
   * Handle 401 unauthorized errors
   */
  private handle401Error(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (!this.isRefreshing) {
      this.isRefreshing = true;
      this.refreshTokenSubject.next(null);

      return this.authService.refreshToken().pipe(
        switchMap((token) => {
          this.isRefreshing = false;
          this.refreshTokenSubject.next(token.accessToken);
          
          // Retry the original request with new token
          const newReq = this.addAuthHeader(req);
          return next.handle(newReq);
        }),
        catchError(error => {
          this.isRefreshing = false;
          this.authService.logout();
          return throwError(() => error);
        })
      );
    } else {
      // Wait for refresh to complete
      return this.refreshTokenSubject.pipe(
        filter(token => token !== null),
        take(1),
        switchMap(() => {
          const newReq = this.addAuthHeader(req);
          return next.handle(newReq);
        })
      );
    }
  }

  /**
   * Check if request should skip authentication
   */
  private shouldSkipAuth(url: string): boolean {
    const skipUrls = [
      '/auth/login',
      '/auth/register',
      '/auth/refresh',
      '/auth/forgot-password',
      '/public',
      '/assets',
      '.json'
    ];

    return skipUrls.some(skipUrl => url.includes(skipUrl));
  }

  /**
   * Generate unique request ID for tracking
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }
}

// Functional interceptor (modern Angular approach)
export function authInterceptorFn(req: HttpRequest<unknown>, next: HttpHandlerFn): Observable<HttpEvent<unknown>> {
  const authService = inject(AuthService);
  const jwtService = inject(JwtTokenService);
  const configService = inject(ConfigService);
  
  // Skip auth for certain endpoints
  const shouldSkipAuth = (url: string): boolean => {
    const skipUrls = [
      '/auth/login',
      '/auth/register', 
      '/auth/refresh',
      '/auth/forgot-password',
      '/public',
      '/assets',
      '.json'
    ];
    return skipUrls.some(skipUrl => url.includes(skipUrl));
  };

  if (shouldSkipAuth(req.url)) {
    return next(req);
  }

  // Add auth header
  const token = authService.getToken();
  let authReq = req;

  if (token && !jwtService.isTokenExpired(token)) {
    authReq = req.clone({
      setHeaders: {
        'Authorization': `Bearer ${token}`,
        'X-Request-ID': `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
        'X-API-Version': configService.getConfig()?.version || '1.0.0'
      }
    });
  }

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        // Handle 401 by logging out (simplified approach)
        // authService.logout();
      }
      return throwError(() => error);
    })
  );
}