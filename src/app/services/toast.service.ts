import { Injectable, signal } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  timestamp: Date;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private toastsSubject = new BehaviorSubject<Toast[]>([]);
  private toastCounter = 0;

  public readonly toasts$ = this.toastsSubject.asObservable();
  public readonly toasts = signal<Toast[]>([]);

  constructor() {
    // Keep signal in sync with subject
    this.toasts$.subscribe(toasts => {
      this.toasts.set(toasts);
    });
  }

  private generateId(): string {
    return `toast-${++this.toastCounter}-${Date.now()}`;
  }

  private addToast(toast: Omit<Toast, 'id' | 'timestamp'>): string {
    const newToast: Toast = {
      id: this.generateId(),
      timestamp: new Date(),
      duration: toast.duration || 5000,
      ...toast
    };

    const currentToasts = this.toastsSubject.value;
    this.toastsSubject.next([...currentToasts, newToast]);

    // Auto-remove after duration
    if (newToast.duration && newToast.duration > 0) {
      setTimeout(() => {
        this.removeToast(newToast.id);
      }, newToast.duration);
    }

    return newToast.id;
  }

  success(title: string, message?: string, duration?: number): string {
    return this.addToast({ type: 'success', title, message, duration });
  }

  error(title: string, message?: string, duration?: number): string {
    return this.addToast({ type: 'error', title, message, duration: duration || 7000 });
  }

  warning(title: string, message?: string, duration?: number): string {
    return this.addToast({ type: 'warning', title, message, duration });
  }

  info(title: string, message?: string, duration?: number): string {
    return this.addToast({ type: 'info', title, message, duration });
  }

  removeToast(id: string): void {
    const currentToasts = this.toastsSubject.value;
    const filteredToasts = currentToasts.filter(toast => toast.id !== id);
    this.toastsSubject.next(filteredToasts);
  }

  clearAll(): void {
    this.toastsSubject.next([]);
  }

  // Utility methods for common scenarios
  showApiSuccess(message: string = 'Operation completed successfully'): string {
    return this.success('Success', message);
  }

  showApiError(message: string = 'Something went wrong'): string {
    return this.error('Error', message);
  }

  showCopySuccess(): string {
    return this.success('Copied to clipboard', '', 2000);
  }
}