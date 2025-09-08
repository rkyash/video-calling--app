export interface JwtPayload {
  sub?: string; // Subject (user ID)
  iat?: number; // Issued at
  exp?: number; // Expiration time
  iss?: string; // Issuer
  aud?: string; // Audience
  email?: string;
  username?: string;
  roles?: string[];
  permissions?: string[];
  [key: string]: any; // Allow additional custom claims
}

export interface AuthToken {
  accessToken: string;
  refreshToken?: string;
  tokenType?: string;
  expiresIn?: number;
}

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  roles: string[];
  permissions: string[];
  avatar?: string;
  isActive: boolean;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: UserProfile | null;
  token: AuthToken | null;
  loading: boolean;
  error: string | null;
}

export enum TokenStorageKey {
  ACCESS_TOKEN = 'access_token',
  REFRESH_TOKEN = 'refresh_token',
  USER_PROFILE = 'user_profile'
}