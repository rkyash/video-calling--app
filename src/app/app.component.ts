import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ToastComponent } from './components/toast/toast.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, ToastComponent],
  template: `
    <div class="app-container">
      <router-outlet></router-outlet>
      <app-toast></app-toast>
    </div>
  `,
  styles: [`
    .app-container {
      min-height: 100vh;
      background-color: var(--dark-bg);
      color: var(--text-light);
    }
  `]
})
export class AppComponent {
  title = 'VideoMeet';
}