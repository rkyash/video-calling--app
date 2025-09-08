import { Injectable } from '@angular/core';
import { JwtPayload } from '../models/auth.model';

@Injectable({
  providedIn: 'root'
})
export class JwtTokenService {

  /**
   * Decodes JWT token without verification (client-side only)
   */
  decodeToken(token: string): JwtPayload | null {
    try {
      if (!token || token === '') {
        return null;
      }

      // Remove Bearer prefix if present
      const cleanToken = token.replace(/^Bearer\s+/i, '');
      
      // JWT has 3 parts separated by dots
      const parts = cleanToken.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid JWT token format');
      }

      // Decode the payload (second part)
      const payload = parts[1];
      
      // Add padding if needed for base64 decoding
      const padded = payload + '='.repeat((4 - payload.length % 4) % 4);
      
      // Decode from base64url to base64
      const base64 = padded.replace(/-/g, '+').replace(/_/g, '/');
      
      // Decode and parse JSON
      const decoded = JSON.parse(atob(base64));
      
      return decoded as JwtPayload;
    } catch (error) {
      console.error('Error decoding JWT token:', error);
      return null;
    }
  }

  /**
   * Checks if token is expired
   */
  isTokenExpired(token: string): boolean {
    const decoded = this.decodeToken(token);
    if (!decoded || !decoded.exp) {
      return true;
    }

    const currentTime = Math.floor(Date.now() / 1000);
    return decoded.exp < currentTime;
  }

  /**
   * Gets token expiration date
   */
  getTokenExpirationDate(token: string): Date | null {
    const decoded = this.decodeToken(token);
    if (!decoded || !decoded.exp) {
      return null;
    }

    return new Date(decoded.exp * 1000);
  }

  /**
   * Gets remaining time until token expires (in seconds)
   */
  getTokenRemainingTime(token: string): number {
    const decoded = this.decodeToken(token);
    if (!decoded || !decoded.exp) {
      return 0;
    }

    const currentTime = Math.floor(Date.now() / 1000);
    const remainingTime = decoded.exp - currentTime;
    
    return Math.max(0, remainingTime);
  }

  /**
   * Checks if token will expire within specified minutes
   */
  willTokenExpireSoon(token: string, minutesThreshold: number = 5): boolean {
    const remainingTime = this.getTokenRemainingTime(token);
    const thresholdSeconds = minutesThreshold * 60;
    
    return remainingTime <= thresholdSeconds;
  }

  /**
   * Extracts user ID from token
   */
  getUserIdFromToken(token: string): string | null {
    const decoded = this.decodeToken(token);
    return decoded?.sub || null;
  }

  /**
   * Extracts user email from token
   */
  getUserEmailFromToken(token: string): string | null {
    const decoded = this.decodeToken(token);
    return decoded?.email || null;
  }

  /**
   * Extracts user roles from token
   */
  getUserRolesFromToken(token: string): string {
    const decoded = this.decodeToken(token);
    return decoded?.rolename || "";
  }


  /**
   * Checks if user has specific role
   */
  hasRole(token: string, role: string): boolean {
    const roles = this.getUserRolesFromToken(token);
    return roles.includes(role);
  }

  /**
   * Checks if user has any of the specified roles
   */
  hasAnyRole(token: string, roles: string[]): boolean {
    const userRoles = this.getUserRolesFromToken(token);
    return roles.some(role => userRoles.includes(role));
  }

  /**
   * Validates token format and basic structure
   */
  isValidTokenFormat(token: string): boolean {
    if (!token) return false;
    
    const cleanToken = token.replace(/^Bearer\s+/i, '');
    const parts = cleanToken.split('.');
    
    return parts.length === 3 && parts.every(part => part.length > 0);
  }
}