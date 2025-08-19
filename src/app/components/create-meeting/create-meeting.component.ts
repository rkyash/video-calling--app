import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MeetingService } from '../../services/meeting.service';

@Component({
  selector: 'app-create-meeting',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="create-meeting-container">
      <header class="header">
        <div class="container">
          <button class="btn btn-outline" routerLink="/">
            <i class="fas fa-arrow-left"></i>
            Back to Home
          </button>
          <div class="logo">
            <h1><i class="fas fa-video"></i> VideoMeet</h1>
          </div>
        </div>
      </header>

      <main class="main">
        <div class="container">
          <div class="create-form-container">
            <div class="form-card">
              <div class="form-header">
                <h2><i class="fas fa-plus-circle"></i> Create New Meeting</h2>
                <p>Set up your video conference and invite participants</p>
              </div>

              <form (ngSubmit)="createMeeting()" #meetingForm="ngForm" class="meeting-form">
                <div class="form-group">
                  <label for="hostName">Your Name *</label>
                  <input
                    type="text"
                    id="hostName"
                    name="hostName"
                    [(ngModel)]="hostName"
                    required
                    placeholder="Enter your full name"
                    class="form-input"
                  >
                </div>

                <div class="form-group">
                  <label for="meetingName">Meeting Title *</label>
                  <input
                    type="text"
                    id="meetingName"
                    name="meetingName"
                    [(ngModel)]="meetingName"
                    required
                    placeholder="Enter meeting title"
                    class="form-input"
                  >
                </div>

                <div class="form-group">
                  <label for="meetingDescription">Description (Optional)</label>
                  <textarea
                    id="meetingDescription"
                    name="meetingDescription"
                    [(ngModel)]="meetingDescription"
                    placeholder="Brief description of the meeting"
                    rows="3"
                    class="form-input"
                  ></textarea>
                </div>

                <div class="meeting-settings">
                  <h3>Meeting Settings</h3>
                  
                  <div class="settings-grid">
                    <div class="setting-item">
                      <label class="checkbox-label">
                        <input
                          type="checkbox"
                          [(ngModel)]="settings.audioEnabled"
                          name="audioEnabled"
                        >
                        <span class="checkmark"></span>
                        <div class="setting-info">
                          <strong>Enable Audio</strong>
                          <small>Allow participants to use microphones</small>
                        </div>
                      </label>
                    </div>

                    <div class="setting-item">
                      <label class="checkbox-label">
                        <input
                          type="checkbox"
                          [(ngModel)]="settings.videoEnabled"
                          name="videoEnabled"
                        >
                        <span class="checkmark"></span>
                        <div class="setting-info">
                          <strong>Enable Video</strong>
                          <small>Allow participants to use cameras</small>
                        </div>
                      </label>
                    </div>

                    <div class="setting-item">
                      <label class="checkbox-label">
                        <input
                          type="checkbox"
                          [(ngModel)]="settings.screenShareEnabled"
                          name="screenShareEnabled"
                        >
                        <span class="checkmark"></span>
                        <div class="setting-info">
                          <strong>Screen Sharing</strong>
                          <small>Allow participants to share screens</small>
                        </div>
                      </label>
                    </div>

                    <div class="setting-item">
                      <label class="checkbox-label">
                        <input
                          type="checkbox"
                          [(ngModel)]="settings.chatEnabled"
                          name="chatEnabled"
                        >
                        <span class="checkmark"></span>
                        <div class="setting-info">
                          <strong>Chat Messages</strong>
                          <small>Enable in-meeting chat</small>
                        </div>
                      </label>
                    </div>

                    <div class="setting-item">
                      <label class="checkbox-label">
                        <input
                          type="checkbox"
                          [(ngModel)]="settings.recordingEnabled"
                          name="recordingEnabled"
                        >
                        <span class="checkmark"></span>
                        <div class="setting-info">
                          <strong>Recording</strong>
                          <small>Allow meeting recording</small>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>

                <div class="form-actions">
                  <button
                    type="submit"
                    class="btn btn-primary btn-large"
                    [disabled]="!meetingForm.valid || isCreating"
                  >
                    <span *ngIf="!isCreating">
                      <i class="fas fa-video"></i>
                      Create Meeting
                    </span>
                    <span *ngIf="isCreating" class="flex items-center gap-2">
                      <div class="spinner"></div>
                      Creating...
                    </span>
                  </button>
                </div>
              </form>

              <div *ngIf="createdMeeting" class="meeting-created fade-in">
                <div class="success-message">
                  <i class="fas fa-check-circle"></i>
                  <h3>Meeting Created Successfully!</h3>
                  <p>Your meeting is ready. Share the link below with participants.</p>
                </div>

                <div class="meeting-info">
                  <div class="info-item">
                    <strong>Meeting ID:</strong>
                    <span class="meeting-id">{{ createdMeeting.id }}</span>
                    <button 
                      class="btn-copy"
                      (click)="copyToClipboard(createdMeeting.id)"
                      title="Copy Meeting ID"
                    >
                      <i class="fas fa-copy"></i>
                    </button>
                  </div>

                  <div class="info-item">
                    <strong>Meeting Link:</strong>
                    <div class="link-container">
                      <span class="meeting-link">{{ meetingLink }}</span>
                      <button 
                        class="btn-copy"
                        (click)="copyToClipboard(meetingLink)"
                        title="Copy Meeting Link"
                      >
                        <i class="fas fa-copy"></i>
                      </button>
                    </div>
                  </div>
                </div>

                <div class="action-buttons">
                  <button 
                    class="btn btn-primary"
                    (click)="joinMeeting()"
                  >
                    <i class="fas fa-sign-in-alt"></i>
                    Join Meeting Now
                  </button>
                  
                  <button 
                    class="btn btn-outline"
                    (click)="createAnother()"
                  >
                    <i class="fas fa-plus"></i>
                    Create Another
                  </button>
                </div>
              </div>
            </div>

            <div class="tips-card">
              <h3><i class="fas fa-lightbulb"></i> Meeting Tips</h3>
              <ul>
                <li>
                  <i class="fas fa-users"></i>
                  <strong>Invite Participants:</strong> Share the meeting link or ID with your attendees
                </li>
                <li>
                  <i class="fas fa-microphone"></i>
                  <strong>Test Your Setup:</strong> Check your camera and microphone before starting
                </li>
                <li>
                  <i class="fas fa-wifi"></i>
                  <strong>Stable Connection:</strong> Ensure you have a reliable internet connection
                </li>
                <li>
                  <i class="fas fa-shield-alt"></i>
                  <strong>Security:</strong> Only share meeting details with trusted participants
                </li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  `,
  styles: [`
    .create-meeting-container {
      min-height: 100vh;
      background: linear-gradient(135deg, var(--dark-bg) 0%, #1e293b 100%);
    }

    .header {
      padding: 1rem 0;
      background: rgba(31, 41, 55, 0.8);
      backdrop-filter: blur(10px);
      border-bottom: 1px solid var(--dark-card);

      .container {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .logo h1 {
        font-size: 1.5rem;
        font-weight: 700;
        color: var(--primary-color);
        
        i {
          margin-right: 0.5rem;
        }
      }
    }

    .main {
      padding: 2rem 0;
    }

    .create-form-container {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 2rem;
      max-width: 1200px;
      margin: 0 auto;

      @media (max-width: 968px) {
        grid-template-columns: 1fr;
        max-width: 600px;
      }
    }

    .form-card, .tips-card {
      background: var(--dark-surface);
      border-radius: 1rem;
      padding: 2rem;
      border: 1px solid var(--dark-card);
      box-shadow: var(--shadow-lg);
    }

    .form-header {
      text-align: center;
      margin-bottom: 2rem;

      h2 {
        font-size: 2rem;
        font-weight: 700;
        color: var(--text-light);
        margin-bottom: 0.5rem;

        i {
          color: var(--primary-color);
          margin-right: 0.5rem;
        }
      }

      p {
        color: var(--text-secondary);
        font-size: 1rem;
      }
    }

    .meeting-form {
      .form-group {
        margin-bottom: 1.5rem;

        label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 600;
          color: var(--text-light);
        }

        .form-input {
          width: 100%;
          padding: 0.875rem 1rem;
          border: 2px solid var(--dark-card);
          border-radius: 0.5rem;
          background-color: var(--dark-card);
          color: var(--text-light);
          font-size: 0.875rem;
          transition: border-color 0.2s;

          &:focus {
            outline: none;
            border-color: var(--primary-color);
            box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
          }

          &::placeholder {
            color: var(--text-secondary);
          }
        }
      }
    }

    .meeting-settings {
      margin: 2rem 0;

      h3 {
        font-size: 1.25rem;
        font-weight: 600;
        color: var(--text-light);
        margin-bottom: 1rem;
      }
    }

    .settings-grid {
      display: grid;
      gap: 1rem;
    }

    .setting-item {
      .checkbox-label {
        display: flex;
        align-items: flex-start;
        gap: 1rem;
        cursor: pointer;
        padding: 1rem;
        border: 1px solid var(--dark-card);
        border-radius: 0.5rem;
        background: var(--dark-bg);
        transition: all 0.2s;

        &:hover {
          border-color: var(--primary-color);
          background: rgba(79, 70, 229, 0.05);
        }

        input[type="checkbox"] {
          display: none;
        }

        .checkmark {
          width: 20px;
          height: 20px;
          border: 2px solid var(--border-color);
          border-radius: 4px;
          background: transparent;
          flex-shrink: 0;
          position: relative;
          transition: all 0.2s;

          &::after {
            content: '';
            position: absolute;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
            width: 12px;
            height: 12px;
            background: var(--primary-color);
            border-radius: 2px;
            opacity: 0;
            transition: opacity 0.2s;
          }
        }

        input[type="checkbox"]:checked + .checkmark {
          border-color: var(--primary-color);

          &::after {
            opacity: 1;
          }
        }

        .setting-info {
          strong {
            color: var(--text-light);
            display: block;
            margin-bottom: 0.25rem;
          }

          small {
            color: var(--text-secondary);
            font-size: 0.875rem;
          }
        }
      }
    }

    .form-actions {
      margin-top: 2rem;

      .btn-large {
        width: 100%;
        padding: 1rem 2rem;
        font-size: 1.125rem;
        font-weight: 600;
      }
    }

    .meeting-created {
      margin-top: 2rem;
      padding: 2rem;
      background: var(--dark-bg);
      border: 1px solid var(--success-color);
      border-radius: 0.75rem;

      .success-message {
        text-align: center;
        margin-bottom: 2rem;

        i {
          font-size: 3rem;
          color: var(--success-color);
          margin-bottom: 1rem;
          display: block;
        }

        h3 {
          font-size: 1.5rem;
          font-weight: 600;
          color: var(--text-light);
          margin-bottom: 0.5rem;
        }

        p {
          color: var(--text-secondary);
        }
      }

      .meeting-info {
        margin-bottom: 2rem;

        .info-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1rem;
          padding: 1rem;
          background: var(--dark-surface);
          border-radius: 0.5rem;

          strong {
            color: var(--text-light);
            min-width: 120px;
          }

          .meeting-id, .meeting-link {
            flex: 1;
            font-family: 'Monaco', 'Courier New', monospace;
            font-size: 0.875rem;
            color: var(--primary-color);
            word-break: break-all;
          }

          .link-container {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            flex: 1;
          }

          .btn-copy {
            background: none;
            border: none;
            color: var(--text-secondary);
            cursor: pointer;
            padding: 0.5rem;
            border-radius: 0.25rem;
            transition: all 0.2s;

            &:hover {
              color: var(--primary-color);
              background: rgba(79, 70, 229, 0.1);
            }
          }
        }
      }

      .action-buttons {
        display: flex;
        gap: 1rem;
        justify-content: center;

        @media (max-width: 640px) {
          flex-direction: column;
        }
      }
    }

    .tips-card {
      h3 {
        font-size: 1.25rem;
        font-weight: 600;
        color: var(--text-light);
        margin-bottom: 1.5rem;

        i {
          color: var(--warning-color);
          margin-right: 0.5rem;
        }
      }

      ul {
        list-style: none;
        padding: 0;
        margin: 0;

        li {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          margin-bottom: 1.5rem;
          padding: 1rem;
          background: var(--dark-bg);
          border-radius: 0.5rem;

          i {
            color: var(--primary-color);
            margin-top: 0.25rem;
            flex-shrink: 0;
          }

          strong {
            color: var(--text-light);
            display: block;
            margin-bottom: 0.25rem;
          }
        }
      }
    }
  `]
})
export class CreateMeetingComponent {
  hostName: string = '';
  meetingName: string = '';
  meetingDescription: string = '';
  isCreating: boolean = false;
  createdMeeting: any = null;
  meetingLink: string = '';

  settings = {
    audioEnabled: true,
    videoEnabled: true,
    screenShareEnabled: true,
    chatEnabled: true,
    recordingEnabled: true
  };

  constructor(
    private meetingService: MeetingService,
    private router: Router
  ) {}

  async createMeeting(): Promise<void> {
    if (!this.hostName.trim() || !this.meetingName.trim()) {
      return;
    }

    this.isCreating = true;

    try {
      await new Promise(resolve => setTimeout(resolve, 1500));

      this.createdMeeting = this.meetingService.createMeeting(
        this.hostName.trim(),
        this.meetingName.trim()
      );

      this.meetingLink = this.meetingService.generateMeetingLink(this.createdMeeting.id);
    } catch (error) {
      console.error('Failed to create meeting:', error);
    } finally {
      this.isCreating = false;
    }
  }

  copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text).then(() => {
      console.log('Copied to clipboard');
    }).catch(err => {
      console.error('Failed to copy to clipboard:', err);
    });
  }

  joinMeeting(): void {
    if (this.createdMeeting) {
      this.router.navigate(['/meeting', this.createdMeeting.id], {
        queryParams: { name: this.hostName, host: true }
      });
    }
  }

  createAnother(): void {
    this.createdMeeting = null;
    this.hostName = '';
    this.meetingName = '';
    this.meetingDescription = '';
    this.meetingLink = '';
  }
}