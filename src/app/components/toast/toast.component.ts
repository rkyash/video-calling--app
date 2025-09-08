import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-container">
      @for (toast of toastService.toasts(); track toast.id) {
        <div 
          class="toast toast-{{toast.type}} slide-in"
          (click)="removeToast(toast.id)"
        >
          <div class="toast-icon">
            <i [class]="getIconClass(toast.type)"></i>
          </div>
          <div class="toast-content">
            <div class="toast-title">{{ toast.title }}</div>
            @if (toast.message) {
              <div class="toast-message">{{ toast.message }}</div>
            }
          </div>
          <button class="toast-close" (click)="removeToast(toast.id)">
            <i class="fas fa-times"></i>
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    .toast-container {
      position: fixed;
      top: 1rem;
      right: 1rem;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      max-width: 400px;
    }

    .toast {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      padding: 1rem;
      background: var(--dark-surface);
      border: 1px solid var(--dark-card);
      border-radius: 0.75rem;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
      cursor: pointer;
      transition: all 0.3s ease;
      backdrop-filter: blur(10px);

      &:hover {
        transform: translateX(-4px);
      }
    }

    .toast-success {
      border-left: 4px solid var(--success-color);
      .toast-icon i { color: var(--success-color); }
    }

    .toast-error {
      border-left: 4px solid var(--error-color);
      .toast-icon i { color: var(--error-color); }
    }

    .toast-warning {
      border-left: 4px solid var(--warning-color);
      .toast-icon i { color: var(--warning-color); }
    }

    .toast-info {
      border-left: 4px solid var(--info-color);
      .toast-icon i { color: var(--info-color); }
    }

    .toast-icon {
      flex-shrink: 0;
      
      i {
        font-size: 1.25rem;
      }
    }

    .toast-content {
      flex: 1;
      min-width: 0;
    }

    .toast-title {
      font-weight: 600;
      color: var(--text-light);
      font-size: 0.875rem;
      margin-bottom: 0.25rem;
    }

    .toast-message {
      color: var(--text-secondary);
      font-size: 0.8125rem;
      line-height: 1.4;
    }

    .toast-close {
      background: none;
      border: none;
      color: var(--text-secondary);
      cursor: pointer;
      padding: 0.25rem;
      border-radius: 0.25rem;
      flex-shrink: 0;
      transition: all 0.2s;

      &:hover {
        color: var(--text-light);
        background: rgba(255, 255, 255, 0.1);
      }

      i {
        font-size: 0.875rem;
      }
    }

    .slide-in {
      animation: slideIn 0.3s ease;
    }

    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    @media (max-width: 640px) {
      .toast-container {
        top: 0.5rem;
        right: 0.5rem;
        left: 0.5rem;
        max-width: none;
      }
    }
  `]
})
export class ToastComponent {
  constructor(public toastService: ToastService) {}

  removeToast(id: string): void {
    this.toastService.removeToast(id);
  }

  getIconClass(type: string): string {
    const icons = {
      success: 'fas fa-check-circle',
      error: 'fas fa-exclamation-circle',
      warning: 'fas fa-exclamation-triangle',
      info: 'fas fa-info-circle'
    };
    return icons[type as keyof typeof icons] || icons.info;
  }
}