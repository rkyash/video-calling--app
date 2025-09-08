export interface JwtPayload {
  sub?: string; // Subject (user ID)
  iat?: number; // Issued at
  exp?: number; // Expiration time
  iss?: string; // Issuer
  aud?: string; // Audience
  email?: string; 
  UserId?: string;
  GuId?: string;
  roleid?: string;
  rolename?: string;
  firstname?: string;
  lastname?: string;
  usr_email?: string;
  mobile?: string;
  creationdate?: string;
  isactive?: string; 
}

export interface AuthToken {
  accessToken: string;
  fullName?: string;
  refreshToken?: string;
  tokenType?: string;
  expiresIn?: number;
}

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  firstName?: string;
  lastName?: string;
  UserId?: string;
  GuId?: string;
  roleid?: string;
  rolename: string;    
  mobile?: string; 
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