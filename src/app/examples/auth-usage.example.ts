import { Component, OnInit, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../services/auth.service';
import { JwtTokenService } from '../services/jwt-token.service';

@Component({
  selector: 'app-auth-usage-example',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="auth-example">
      <!-- Login Form -->
      <div class="login-section" *ngIf="!authService.isAuthenticated()">
        <h2>Login</h2>
        <form [formGroup]="loginForm" (ngSubmit)="onLogin()">
          <div class="form-group">
            <label for="email">Email:</label>
            <input 
              id="email" 
              type="email" 
              formControlName="email" 
              class="form-control"
            />
          </div>
          <div class="form-group">
            <label for="password">Password:</label>
            <input 
              id="password" 
              type="password" 
              formControlName="password" 
              class="form-control"
            />
          </div>
          <button 
            type="submit" 
            [disabled]="loginForm.invalid || authService.loading()"
            class="btn btn-primary"
          >
            {{ authService.loading() ? 'Logging in...' : 'Login' }}
          </button>
        </form>
        
        <!-- Error Display -->
        <div *ngIf="authService.error()" class="alert alert-error">
          {{ authService.error() }}
        </div>
      </div>

      <!-- Authenticated User Info -->
      <div class="user-info" *ngIf="authService.isAuthenticated()">
        <h2>Welcome, {{ authService.currentUser()?.username }}!</h2>
        
        <div class="user-details">
          <p><strong>Email:</strong> {{ authService.currentUser()?.email }}</p>
          <p><strong>Roles:</strong> {{ userRolesDisplay() }}</p>
          <p><strong>Permissions:</strong> {{ userPermissionsDisplay() }}</p>
          <p><strong>Is Admin:</strong> {{ authService.isAdmin() ? 'Yes' : 'No' }}</p>
        </div>

        <!-- Token Information -->
        <div class="token-info">
          <h3>Token Information</h3>
          <p><strong>Token Expires:</strong> {{ tokenExpiration() }}</p>
          <p><strong>Time Remaining:</strong> {{ timeRemaining() }}</p>
          <p><strong>Will Expire Soon:</strong> {{ willExpireSoon() ? 'Yes' : 'No' }}</p>
        </div>

        <!-- Role & Permission Checks -->
        <div class="permissions-check">
          <h3>Permission Checks</h3>
          <p>Can Create Meeting: {{ canCreateMeeting() ? 'Yes' : 'No' }}</p>
          <p>Can Manage Users: {{ canManageUsers() ? 'Yes' : 'No' }}</p>
          <p>Is Moderator: {{ isModerator() ? 'Yes' : 'No' }}</p>
        </div>

        <button (click)="onLogout()" class="btn btn-secondary">Logout</button>
      </div>
    </div>
  `,
  styles: [`
    .auth-example {
      max-width: 600px;
      margin: 20px auto;
      padding: 20px;
    }
    
    .form-group {
      margin-bottom: 15px;
    }
    
    .form-control {
      width: 100%;
      padding: 8px;
      border: 1px solid #ddd;
      border-radius: 4px;
    }
    
    .btn {
      padding: 10px 20px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      margin-right: 10px;
    }
    
    .btn-primary {
      background-color: #007bff;
      color: white;
    }
    
    .btn-secondary {
      background-color: #6c757d;
      color: white;
    }
    
    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    .alert {
      padding: 10px;
      margin: 10px 0;
      border-radius: 4px;
    }
    
    .alert-error {
      background-color: #f8d7da;
      color: #721c24;
      border: 1px solid #f5c6cb;
    }
    
    .user-details,
    .token-info,
    .permissions-check {
      margin: 20px 0;
      padding: 15px;
      background-color: #f8f9fa;
      border-radius: 4px;
    }
  `]
})
export class AuthUsageExampleComponent implements OnInit {
  loginForm: FormGroup;

  // Computed values for template
  userRolesDisplay = computed(() => 
    this.authService.userRoles().join(', ') || 'No roles'
  );
  
  userPermissionsDisplay = computed(() => 
    this.authService.userPermissions().join(', ') || 'No permissions'
  );

  tokenExpiration = computed(() => {
    const token = this.authService.getToken();
    if (!token) return 'No token';
    
    const expDate = this.jwtService.getTokenExpirationDate(token);
    return expDate ? expDate.toLocaleString() : 'No expiration';
  });

  timeRemaining = computed(() => {
    const token = this.authService.getToken();
    if (!token) return 'No token';
    
    const remaining = this.jwtService.getTokenRemainingTime(token);
    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;
    return `${minutes}m ${seconds}s`;
  });

  willExpireSoon = computed(() => {
    const token = this.authService.getToken();
    return token ? this.jwtService.willTokenExpireSoon(token, 10) : false;
  });

  canCreateMeeting = computed(() => 
    this.authService.hasPermission('meeting:create')
  );
  
  canManageUsers = computed(() => 
    this.authService.hasPermission('user:manage')
  );
  
  isModerator = computed(() => 
    this.authService.hasRole('moderator')
  );

  constructor(
    public authService: AuthService,
    private jwtService: JwtTokenService,
    private fb: FormBuilder
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });

    // Effect to react to auth state changes
    effect(() => {
      const isAuth = this.authService.isAuthenticated();
      const user = this.authService.currentUser();
      
      console.log('Auth state changed:', { isAuth, user });
      
      if (isAuth) {
        console.log('User roles:', this.authService.userRoles());
        console.log('User permissions:', this.authService.userPermissions());
      }
    });
  }

  ngOnInit(): void {
    // Subscribe to auth state changes (alternative to effects)
    this.authService.authState$.subscribe(state => {
      console.log('Auth state update:', state);
    });
  }

  onLogin(): void {
    if (this.loginForm.valid) {
      const credentials = this.loginForm.value;
      
      this.authService.login(credentials).subscribe({
        next: (token) => {
          console.log('Login successful:', token);
          this.loginForm.reset();
        },
        error: (error) => {
          console.error('Login failed:', error);
        }
      });
    }
  }

  onLogout(): void {
    this.authService.logout();
  }
}