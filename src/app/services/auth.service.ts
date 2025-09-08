import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, BehaviorSubject, throwError, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { AuthToken, UserProfile, AuthState, TokenStorageKey } from '../models/auth.model';
import { JwtTokenService } from './jwt-token.service';
import { ConfigService } from './config.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly authStateSubject = new BehaviorSubject<AuthState>({
    isAuthenticated: false,
    user: null,
    token: null,
    loading: false,
    error: null
  });

  // Modern Angular signals for reactive state
  private readonly _isAuthenticated = signal(false);
  private readonly _currentUser = signal<UserProfile | null>(null);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  // Public readonly signals
  public readonly isAuthenticated = this._isAuthenticated.asReadonly();
  public readonly currentUser = this._currentUser.asReadonly();
  public readonly loading = this._loading.asReadonly();
  public readonly error = this._error.asReadonly();

  // Computed signals
  public readonly userRoles = computed(() => this.currentUser()?.rolename || "");
  public readonly isAdmin = computed(() => this.userRoles().includes('admin'));

  // Observable for components that prefer observables
  public readonly authState$ = this.authStateSubject.asObservable();

  private tokenRefreshTimer?: number;

  constructor(
    private http: HttpClient,
    private router: Router,
    private jwtService: JwtTokenService,
    private configService: ConfigService
  ) {
    this.initializeAuth();
  }

  private initializeAuth(): void {
    const token = this.getStoredToken();
    if (token && !this.jwtService.isTokenExpired(token)) {
      this.setAuthToken({ accessToken: token });
      this.loadUserProfile();
      this.scheduleTokenRefresh(token);
    } else if (token) {
      // Token exists but is expired
      this.logout();
    }
  }

 
  /**
   * Logout user
   */
  logout(): void {
    this.clearAuthData();
    this.clearTokenRefreshTimer();
    this._isAuthenticated.set(false);
    this._currentUser.set(null);
    this.updateAuthState();
    this.router.navigate(['/login']);
  }

  /**
   * Refresh token
   */
  refreshToken(): Observable<AuthToken> {
    const refreshToken = this.getStoredRefreshToken();
    if (!refreshToken) {
      return throwError(() => new Error('No refresh token available'));
    }

    const apiUrl = this.configService.getFullApiUrl('auth/refresh');

    return this.http.post<AuthToken>(apiUrl, { refreshToken }).pipe(
      tap(token => {
        this.handleSuccessfulAuth(token);
      }),
      catchError(error => {
        this.logout(); // Force logout on refresh failure
        return throwError(() => error);
      })
    );
  }

  /**
   * Get current access token
   */
  getToken(): string | null {
    return this.getStoredToken();
  }

  /**
   * Check if user has specific role
   */
  hasRole(role: string): boolean {
    const token = this.getToken();
    return token ? this.jwtService.hasRole(token, role) : false;
  }


  /**
   * Check if user has any of the specified roles
   */
  hasAnyRole(roles: string[]): boolean {
    const token = this.getToken();
    return token ? this.jwtService.hasAnyRole(token, roles) : false;
  }



  /**
   * Get user profile from token
   */
  private getUserProfileFromToken(token: string): UserProfile | null {
    const decoded = this.jwtService.decodeToken(token);
    if (!decoded) return null;

    return {
      id: decoded.sub || '',
      email: decoded.usr_email || '',
      firstName: decoded.usr_email || '',
      lastName: decoded.usr_email || '',
      fullName: `${decoded.firstname || ''} ${decoded.lastname || ''}`.trim(),
      UserId: decoded.UserId || '',
      GuId: decoded.GuId || '',
      roleid: decoded.roleid || '',
      rolename: decoded.rolename || "",
    };
  }

  /**
   * Load user profile from server (optional, for additional data)
   */
  public loadUserProfile(): void {
    const token = this.getToken();
    if (!token) return;

    // First, try to get profile from token
    const profileFromToken = this.getUserProfileFromToken(token);
    if (profileFromToken) {
      this._currentUser.set(profileFromToken);
      this.updateAuthState();
    }

    // Optionally load additional profile data from server
    const apiUrl = this.configService.getFullApiUrl('auth/profile');
    this.http.get<UserProfile>(apiUrl).pipe(
      catchError(() => of(null)) // Don't fail if profile endpoint is not available
    ).subscribe(profile => {
      if (profile) {
        this._currentUser.set(profile);
        this.storeUserProfile(profile);
        this.updateAuthState();
      }
    });
  }

  /**
   * Handle successful authentication
   */
  private handleSuccessfulAuth(token: AuthToken): void {
    this.setAuthToken(token);
    this._isAuthenticated.set(true);
    this._error.set(null);

    const userProfile = this.getUserProfileFromToken(token.accessToken);
    if (userProfile) {
      this._currentUser.set(userProfile);
    }

    this.scheduleTokenRefresh(token.accessToken);
    this.updateAuthState();
  }

  /**
   * Handle authentication error
   */
  private handleAuthError(message: string): void {
    this._error.set(message);
    this._loading.set(false);
    this.updateAuthState();
  }

  /**
   * Update auth state subject
   */
  private updateAuthState(): void {
    this.authStateSubject.next({
      isAuthenticated: this._isAuthenticated(),
      user: this._currentUser(),
      token: this.getStoredToken() ? { accessToken: this.getStoredToken()! } : null,
      loading: this._loading(),
      error: this._error()
    });
  }

  /**
   * Schedule automatic token refresh
   */
  private scheduleTokenRefresh(token: string): void {
    this.clearTokenRefreshTimer();

    if (this.jwtService.willTokenExpireSoon(token, 10)) {
      // Token expires in less than 10 minutes, refresh now
      this.refreshToken().subscribe();
      return;
    }

    const remainingTime = this.jwtService.getTokenRemainingTime(token);
    const refreshTime = Math.max(0, (remainingTime - 300) * 1000); // Refresh 5 minutes before expiry

    this.tokenRefreshTimer = window.setTimeout(() => {
      this.refreshToken().subscribe({
        error: () => this.logout()
      });
    }, refreshTime);
  }

  /**
   * Clear token refresh timer
   */
  private clearTokenRefreshTimer(): void {
    if (this.tokenRefreshTimer) {
      clearTimeout(this.tokenRefreshTimer);
      this.tokenRefreshTimer = undefined;
    }
  }

  // Storage methods
  public setAuthToken(token: AuthToken): void {
    localStorage.setItem(TokenStorageKey.ACCESS_TOKEN, token.accessToken);
    if (token.refreshToken) {
      localStorage.setItem(TokenStorageKey.REFRESH_TOKEN, token.refreshToken);
    }
  }

  public getStoredToken(): string | null {
    return localStorage.getItem(TokenStorageKey.ACCESS_TOKEN);
  }

  private getStoredRefreshToken(): string | null {
    return localStorage.getItem(TokenStorageKey.REFRESH_TOKEN);
  }

  private storeUserProfile(profile: UserProfile): void {
    localStorage.setItem(TokenStorageKey.USER_PROFILE, JSON.stringify(profile));
  }

  private clearAuthData(): void {
    localStorage.removeItem(TokenStorageKey.ACCESS_TOKEN);
    localStorage.removeItem(TokenStorageKey.REFRESH_TOKEN);
    localStorage.removeItem(TokenStorageKey.USER_PROFILE);
  }
}