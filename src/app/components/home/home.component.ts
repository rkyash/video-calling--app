import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="home-container">
      <header class="header">
        <div class="container">
          <div class="logo">
            <h1><i class="fas fa-video"></i> VideoMeet</h1>
          </div>
        </div>
      </header>

      <main class="main">
        <div class="container">
          <div class="hero-section">
            <div class="hero-content">
              <h2 class="hero-title">Professional Video Conferencing Made Simple</h2>
              <p class="hero-subtitle">
                Connect with your team, clients, and colleagues with crystal-clear video calls, 
                screen sharing, and collaborative features.
              </p>

              <div class="action-buttons">
                <button 
                  class="btn btn-primary btn-large"
                  routerLink="/create"
                >
                  <i class="fas fa-plus"></i>
                  Start New Meeting
                </button>

                <div class="join-section">
                  <div class="join-input-group">
                    <input 
                      type="text" 
                      [(ngModel)]="meetingId"
                      placeholder="Enter meeting ID or link"
                      class="join-input"
                      (keyup.enter)="joinMeeting()"
                    >
                    <button 
                      class="btn btn-outline"
                      (click)="joinMeeting()"
                      [disabled]="!meetingId.trim()"
                    >
                      <i class="fas fa-sign-in-alt"></i>
                      Join
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div class="hero-image">
              <div class="video-preview">
                <div class="mock-video-grid">
                  <div class="mock-video participant-1">
                    <div class="participant-info">
                      <span>John Doe</span>
                    </div>
                  </div>
                  <div class="mock-video participant-2">
                    <div class="participant-info">
                      <span>Jane Smith</span>
                    </div>
                  </div>
                  <div class="mock-video participant-3">
                    <div class="participant-info">
                      <span>Mike Johnson</span>
                    </div>
                  </div>
                  <div class="mock-video participant-4">
                    <div class="participant-info">
                      <span>Sarah Wilson</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="features-section">
            <h3 class="features-title">Why Choose VideoMeet?</h3>
            <div class="features-grid">
              <div class="feature-card">
                <div class="feature-icon">
                  <i class="fas fa-video"></i>
                </div>
                <h4>HD Video & Audio</h4>
                <p>Crystal-clear video calls with professional-grade audio quality for seamless communication.</p>
              </div>

              <div class="feature-card">
                <div class="feature-icon">
                  <i class="fas fa-desktop"></i>
                </div>
                <h4>Screen Sharing</h4>
                <p>Share your screen, presentations, or specific applications with just one click.</p>
              </div>

              <div class="feature-card">
                <div class="feature-icon">
                  <i class="fas fa-comments"></i>
                </div>
                <h4>Real-time Chat</h4>
                <p>Stay connected with in-meeting chat for quick messages and file sharing.</p>
              </div>

              <div class="feature-card">
                <div class="feature-icon">
                  <i class="fas fa-record-vinyl"></i>
                </div>
                <h4>Meeting Recording</h4>
                <p>Record important meetings and share them with team members who couldn't attend.</p>
              </div>

              <div class="feature-card">
                <div class="feature-icon">
                  <i class="fas fa-mobile-alt"></i>
                </div>
                <h4>Mobile Responsive</h4>
                <p>Join meetings from any device - desktop, tablet, or smartphone with full functionality.</p>
              </div>

              <div class="feature-card">
                <div class="feature-icon">
                  <i class="fas fa-shield-alt"></i>
                </div>
                <h4>Secure & Private</h4>
                <p>End-to-end encryption and advanced security measures to protect your conversations.</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  `,
  styles: [`
    .home-container {
      min-height: 100vh;
      background: linear-gradient(135deg, var(--dark-bg) 0%, #1e293b 100%);
    }

    .header {
      padding: 1rem 0;
      background: rgba(31, 41, 55, 0.8);
      backdrop-filter: blur(10px);
      border-bottom: 1px solid var(--dark-card);

      .logo h1 {
        font-size: 1.75rem;
        font-weight: 700;
        color: var(--primary-color);
        
        i {
          margin-right: 0.5rem;
        }
      }
    }

    .main {
      padding: 4rem 0;
    }

    .hero-section {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 4rem;
      align-items: center;
      margin-bottom: 6rem;

      @media (max-width: 768px) {
        grid-template-columns: 1fr;
        gap: 2rem;
        text-align: center;
      }
    }

    .hero-content {
      .hero-title {
        font-size: 3rem;
        font-weight: 700;
        margin-bottom: 1.5rem;
        line-height: 1.1;
        background: linear-gradient(135deg, #ffffff 0%, #e2e8f0 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;

        @media (max-width: 768px) {
          font-size: 2rem;
        }
      }

      .hero-subtitle {
        font-size: 1.25rem;
        color: var(--text-secondary);
        margin-bottom: 2.5rem;
        line-height: 1.6;
      }
    }

    .action-buttons {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      max-width: 500px;

      .btn-large {
        padding: 1rem 2rem;
        font-size: 1.125rem;
        font-weight: 600;
      }
    }

    .join-section {
      .join-input-group {
        display: flex;
        gap: 0.75rem;

        @media (max-width: 640px) {
          flex-direction: column;
        }
      }

      .join-input {
        flex: 1;
        padding: 0.875rem 1rem;
        border: 2px solid var(--dark-card);
        border-radius: 0.5rem;
        background-color: var(--dark-surface);
        color: var(--text-light);
        font-size: 0.875rem;

        &:focus {
          border-color: var(--primary-color);
          box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
        }

        &::placeholder {
          color: var(--text-secondary);
        }
      }
    }

    .hero-image {
      display: flex;
      justify-content: center;
      align-items: center;
    }

    .video-preview {
      background: var(--dark-surface);
      border-radius: 1rem;
      padding: 1.5rem;
      box-shadow: var(--shadow-lg);
      border: 1px solid var(--dark-card);
    }

    .mock-video-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.75rem;
      width: 400px;
      height: 300px;

      @media (max-width: 768px) {
        width: 320px;
        height: 240px;
      }
    }

    .mock-video {
      background: linear-gradient(135deg, #374151 0%, #4b5563 100%);
      border-radius: 0.5rem;
      position: relative;
      overflow: hidden;
      display: flex;
      align-items: flex-end;

      &.participant-1 {
        background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
      }

      &.participant-2 {
        background: linear-gradient(135deg, #10b981 0%, #047857 100%);
      }

      &.participant-3 {
        background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
      }

      &.participant-4 {
        background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
      }

      .participant-info {
        background: rgba(0, 0, 0, 0.7);
        color: white;
        padding: 0.5rem;
        font-size: 0.75rem;
        font-weight: 500;
        width: 100%;
        text-align: center;
      }
    }

    .features-section {
      .features-title {
        text-align: center;
        font-size: 2.5rem;
        font-weight: 700;
        margin-bottom: 3rem;
        color: var(--text-light);
      }
    }

    .features-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 2rem;
    }

    .feature-card {
      background: var(--dark-surface);
      padding: 2rem;
      border-radius: 1rem;
      text-align: center;
      border: 1px solid var(--dark-card);
      transition: all 0.3s ease;

      &:hover {
        transform: translateY(-4px);
        box-shadow: var(--shadow-lg);
        border-color: var(--primary-color);
      }

      .feature-icon {
        width: 64px;
        height: 64px;
        background: var(--primary-color);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 1.5rem;

        i {
          font-size: 1.5rem;
          color: white;
        }
      }

      h4 {
        font-size: 1.25rem;
        font-weight: 600;
        margin-bottom: 1rem;
        color: var(--text-light);
      }

      p {
        color: var(--text-secondary);
        line-height: 1.6;
      }
    }
  `]
})
export class HomeComponent implements OnInit, OnDestroy {
  meetingId: string = '';
  meetingCode: string = '';
  originSiteUrl: string = '';
  private messageCount = 0;
  private maxMessages = 1000;

  constructor(private router: Router, private authService: AuthService) { 
    
  }


  ngOnDestroy(): void {
    throw new Error('Method not implemented.');
  }
  ngOnInit(): void {
    throw new Error('Method not implemented.');
  }

  joinMeeting(): void {
    if (this.meetingId?.trim()) {
      let meetingId = this.meetingId.trim();

      if (meetingId.includes('/join/')) {
        meetingId = meetingId.split('/join/')[1];
      }

      this.router.navigate(['/join', meetingId]);
    }
  }

  private sendReadyMessage(): void {
    if (window.opener) {
      console.log('Site B: Sending ready message');
      window.opener.postMessage('ready', this.originSiteUrl);
    }
  }

  private receiveMessage(event: MessageEvent): void {
    console.log('receiveing message from Site A');
    if (event.origin === this.originSiteUrl) {
      const authToken = event.data.jwtToken;

      if (authToken) {
        console.log('Site B: Received message');
        this.authService.setAuthToken(authToken);

        // Send acknowledgment back to Site A
        window.opener.postMessage('token_received', this.originSiteUrl);

        // Remove the event listener after successful processing
        window.removeEventListener('message', this.receiveMessage);

        this.router.navigate([`/meeting/${this.meetingId}/join`]);
      }
    }
  }
}