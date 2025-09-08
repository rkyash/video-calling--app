import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { CanActivateFn, CanMatchFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Modern functional guard to protect routes that require authentication
 */
export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  // Redirect to login page
  return router.createUrlTree(['/login']);
};

/**
 * Guard to protect routes that require specific roles
 */
export const roleGuard = (requiredRoles: string[]): CanActivateFn => {
  return () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (!authService.isAuthenticated()) {
      return router.createUrlTree(['/login']);
    }

    if (authService.hasAnyRole(requiredRoles)) {
      return true;
    }

    // Redirect to unauthorized page or dashboard
    return router.createUrlTree(['/unauthorized']);
  };
};

/**
 * Guard to protect routes that require specific permissions
 */
export const permissionGuard = (requiredPermissions: string[]): CanActivateFn => {
  return () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (!authService.isAuthenticated()) {
      return router.createUrlTree(['/login']);
    }

    if (authService.hasAnyPermission(requiredPermissions)) {
      return true;
    }

    return router.createUrlTree(['/unauthorized']);
  };
};

/**
 * Guard to redirect authenticated users away from login/register pages
 */
export const guestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    return true;
  }

  // Redirect authenticated users to dashboard
  return router.createUrlTree(['/dashboard']);
};

/**
 * Admin guard - requires admin role
 */
export const adminGuard: CanActivateFn = roleGuard(['admin']);

/**
 * Can match guard for lazy loading modules
 */
export const authCanMatch: CanMatchFn = () => {
  const authService = inject(AuthService);
  return authService.isAuthenticated();
};