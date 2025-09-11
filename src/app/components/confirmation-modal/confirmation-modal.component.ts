import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ConfirmationModalConfig {
  title: string;
  message: string;
  warningText?: string;
  confirmText: string;
  cancelText: string;
  icon?: string;
  confirmButtonType?: 'primary' | 'danger' | 'success' | 'warning';
}

@Component({
  selector: 'app-confirmation-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './confirmation-modal.component.html',
  styleUrl: './confirmation-modal.component.scss'
})
export class ConfirmationModalComponent {
  @Input() isOpen: boolean = false;
  @Input() config: ConfirmationModalConfig = {
    title: 'Confirm Action',
    message: 'Are you sure you want to perform this action?',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    confirmButtonType: 'primary'
  };

  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();
  @Output() close = new EventEmitter<void>();

  onConfirm(): void {
    this.confirm.emit();
    this.close.emit();
  }

  onCancel(): void {
    this.cancel.emit();
    this.close.emit();
  }

  onOverlayClick(): void {
    this.onCancel();
  }

  onModalClick(event: Event): void {
    event.stopPropagation();
  }
}