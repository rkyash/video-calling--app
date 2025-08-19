import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MeetingService } from '../../services/meeting.service';

@Component({
  selector: 'app-join-meeting',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="join-meeting-container">
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
          <div class="join-form-container">
            <div class="preview-section">
              <div class="video-preview">
                <video 
                  #localVideo 
                  autoplay 
                  muted 
                  playsinline
                  class="preview-video"
                  [class.hidden]="!isVideoEnabled"
                ></video>
                <div class="video-placeholder" [class.hidden]="isVideoEnabled">
                  <div class="avatar">
                    <i class="fas fa-user"></i>
                  </div>
                  <p>Camera is off</p>
                </div>

                <div class="preview-controls">
                  <button 
                    class="btn btn-icon"
                    [class.btn-secondary]="!isAudioEnabled"
                    [class.btn-outline]="isAudioEnabled"
                    (click)="toggleAudio()"
                    title="Toggle Microphone"
                  >
                    <i [class]="isAudioEnabled ? 'fas fa-microphone' : 'fas fa-microphone-slash'"></i>
                  </button>

                  <button 
                    class="btn btn-icon"
                    [class.btn-secondary]="!isVideoEnabled"
                    [class.btn-outline]="isVideoEnabled"
                    (click)="toggleVideo()"
                    title="Toggle Camera"
                  >
                    <i [class]="isVideoEnabled ? 'fas fa-video' : 'fas fa-video-slash'"></i>
                  </button>

                  <button 
                    class="btn btn-icon btn-outline"
                    (click)="openSettings()"
                    title="Settings"
                  >
                    <i class="fas fa-cog"></i>
                  </button>
                </div>
              </div>

              <div class="device-info" *ngIf="currentDevices">
                <div class="device-item">
                  <i class="fas fa-microphone"></i>
                  <span>{{ currentDevices.audioDevice || 'Default Microphone' }}</span>
                </div>
                <div class="device-item">
                  <i class="fas fa-video"></i>
                  <span>{{ currentDevices.videoDevice || 'Default Camera' }}</span>
                </div>
              </div>
            </div>

            <div class="form-section">
              <div class="form-card">
                <div class="form-header">
                  <h2><i class="fas fa-sign-in-alt"></i> Join Meeting</h2>
                  <p *ngIf="meetingId">Meeting ID: <strong>{{ meetingId }}</strong></p>
                  <p *ngIf="!meetingId">Enter your details to join the meeting</p>
                </div>

                <form (ngSubmit)="joinMeeting()" #joinForm="ngForm" class="join-form">
                  <div class="form-group">
                    <label for="participantName">Your Name *</label>
                    <input
                      type="text"
                      id="participantName"
                      name="participantName"
                      [(ngModel)]="participantName"
                      required
                      placeholder="Enter your full name"
                      class="form-input"
                      [disabled]="isJoining"
                    >
                  </div>

                  <div class="form-group" *ngIf="!meetingId">
                    <label for="meetingIdInput">Meeting ID *</label>
                    <input
                      type="text"
                      id="meetingIdInput"
                      name="meetingIdInput"
                      [(ngModel)]="meetingIdInput"
                      required
                      placeholder="Enter meeting ID"
                      class="form-input"
                      [disabled]="isJoining"
                    >
                  </div>

                  <div class="join-options">
                    <label class="checkbox-label">
                      <input
                        type="checkbox"
                        [(ngModel)]="isAudioEnabled"
                        name="joinWithAudio"
                        (change)="updateAudioPreview()"
                      >
                      <span class="checkmark"></span>
                      <span>Join with microphone on</span>
                    </label>

                    <label class="checkbox-label">
                      <input
                        type="checkbox"
                        [(ngModel)]="isVideoEnabled"
                        name="joinWithVideo"
                        (change)="updateVideoPreview()"
                      >
                      <span class="checkmark"></span>
                      <span>Join with camera on</span>
                    </label>
                  </div>

                  <div class="form-actions">
                    <button
                      type="submit"
                      class="btn btn-primary btn-large"
                      [disabled]="!joinForm.valid || isJoining"
                    >
                      <span *ngIf="!isJoining">
                        <i class="fas fa-sign-in-alt"></i>
                        Join Meeting
                      </span>
                      <span *ngIf="isJoining" class="flex items-center gap-2">
                        <div class="spinner"></div>
                        Joining...
                      </span>
                    </button>
                  </div>
                </form>

                <div *ngIf="error" class="error-message">
                  <i class="fas fa-exclamation-triangle"></i>
                  {{ error }}
                </div>
              </div>

              <div class="info-card">
                <h3><i class="fas fa-info-circle"></i> Before You Join</h3>
                <ul>
                  <li>
                    <i class="fas fa-check"></i>
                    Test your camera and microphone
                  </li>
                  <li>
                    <i class="fas fa-check"></i>
                    Ensure stable internet connection
                  </li>
                  <li>
                    <i class="fas fa-check"></i>
                    Find a quiet, well-lit space
                  </li>
                  <li>
                    <i class="fas fa-check"></i>
                    Close unnecessary applications
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>

      <!-- Settings Modal -->
      <div class="modal-overlay" *ngIf="showSettings" (click)="closeSettings()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3><i class="fas fa-cog"></i> Device Settings</h3>
            <button class="modal-close" (click)="closeSettings()">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <div class="modal-body">
            <div class="device-settings">
              <div class="setting-group">
                <label>Camera</label>
                <select [(ngModel)]="selectedVideoDevice" (change)="changeVideoDevice()" class="form-input">
                  <option *ngFor="let device of videoDevices" [value]="device.deviceId">
                    {{ device.label || 'Camera ' + (device.deviceId | slice:0:8) }}
                  </option>
                </select>
              </div>

              <div class="setting-group">
                <label>Microphone</label>
                <select [(ngModel)]="selectedAudioDevice" (change)="changeAudioDevice()" class="form-input">
                  <option *ngFor="let device of audioDevices" [value]="device.deviceId">
                    {{ device.label || 'Microphone ' + (device.deviceId | slice:0:8) }}
                  </option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .join-meeting-container {
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

    .join-form-container {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 2rem;
      max-width: 1200px;
      margin: 0 auto;

      @media (max-width: 968px) {
        grid-template-columns: 1fr;
        max-width: 600px;
      }
    }

    .preview-section {
      .video-preview {
        position: relative;
        background: var(--dark-surface);
        border-radius: 1rem;
        overflow: hidden;
        aspect-ratio: 16/9;
        margin-bottom: 1rem;
        border: 1px solid var(--dark-card);

        .preview-video {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transform: scaleX(-1);
        }

        .video-placeholder {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #374151 0%, #4b5563 100%);

          .avatar {
            width: 80px;
            height: 80px;
            background: var(--primary-color);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 1rem;

            i {
              font-size: 2rem;
              color: white;
            }
          }

          p {
            color: var(--text-secondary);
            font-weight: 500;
          }
        }

        .preview-controls {
          position: absolute;
          bottom: 1rem;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 0.5rem;
        }
      }
    }

    .device-info {
      background: var(--dark-surface);
      border-radius: 0.5rem;
      padding: 1rem;
      border: 1px solid var(--dark-card);

      .device-item {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 0.5rem;
        font-size: 0.875rem;

        &:last-child {
          margin-bottom: 0;
        }

        i {
          color: var(--primary-color);
          width: 16px;
        }

        span {
          color: var(--text-secondary);
        }
      }
    }

    .form-section {
      .form-card, .info-card {
        background: var(--dark-surface);
        border-radius: 1rem;
        padding: 2rem;
        border: 1px solid var(--dark-card);
        box-shadow: var(--shadow-lg);
        margin-bottom: 1.5rem;
      }

      .form-header {
        text-align: center;
        margin-bottom: 2rem;

        h2 {
          font-size: 1.75rem;
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

          strong {
            color: var(--primary-color);
            font-family: 'Monaco', 'Courier New', monospace;
          }
        }
      }

      .join-form {
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

            &:disabled {
              opacity: 0.6;
              cursor: not-allowed;
            }
          }
        }

        .join-options {
          margin: 2rem 0;

          .checkbox-label {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            cursor: pointer;
            padding: 0.75rem 0;

            input[type="checkbox"] {
              display: none;
            }

            .checkmark {
              width: 18px;
              height: 18px;
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
                width: 10px;
                height: 10px;
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

            span:last-child {
              color: var(--text-light);
              font-weight: 500;
            }
          }
        }

        .form-actions {
          .btn-large {
            width: 100%;
            padding: 1rem 2rem;
            font-size: 1.125rem;
            font-weight: 600;
          }
        }

        .error-message {
          margin-top: 1rem;
          padding: 1rem;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid var(--secondary-color);
          border-radius: 0.5rem;
          color: #fca5a5;
          display: flex;
          align-items: center;
          gap: 0.5rem;

          i {
            color: var(--secondary-color);
          }
        }
      }

      .info-card {
        h3 {
          font-size: 1.125rem;
          font-weight: 600;
          color: var(--text-light);
          margin-bottom: 1rem;

          i {
            color: var(--primary-color);
            margin-right: 0.5rem;
          }
        }

        ul {
          list-style: none;
          padding: 0;
          margin: 0;

          li {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            margin-bottom: 0.75rem;
            color: var(--text-secondary);

            i {
              color: var(--success-color);
              width: 16px;
            }
          }
        }
      }
    }

    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .modal-content {
      background: var(--dark-surface);
      border-radius: 1rem;
      width: 90%;
      max-width: 500px;
      border: 1px solid var(--dark-card);

      .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1.5rem;
        border-bottom: 1px solid var(--dark-card);

        h3 {
          font-size: 1.25rem;
          font-weight: 600;
          color: var(--text-light);

          i {
            color: var(--primary-color);
            margin-right: 0.5rem;
          }
        }

        .modal-close {
          background: none;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          padding: 0.5rem;
          border-radius: 0.25rem;

          &:hover {
            color: var(--text-light);
            background: var(--dark-card);
          }
        }
      }

      .modal-body {
        padding: 1.5rem;

        .device-settings {
          .setting-group {
            margin-bottom: 1.5rem;

            label {
              display: block;
              margin-bottom: 0.5rem;
              font-weight: 600;
              color: var(--text-light);
            }

            .form-input {
              width: 100%;
              padding: 0.75rem;
              border: 2px solid var(--dark-card);
              border-radius: 0.5rem;
              background-color: var(--dark-card);
              color: var(--text-light);
              font-size: 0.875rem;

              &:focus {
                outline: none;
                border-color: var(--primary-color);
              }
            }
          }
        }
      }
    }
  `]
})
export class JoinMeetingComponent implements OnInit {
  meetingId: string = '';
  meetingIdInput: string = '';
  participantName: string = '';
  isJoining: boolean = false;
  error: string = '';
  
  isAudioEnabled: boolean = true;
  isVideoEnabled: boolean = true;
  
  showSettings: boolean = false;
  localStream: MediaStream | null = null;
  
  audioDevices: MediaDeviceInfo[] = [];
  videoDevices: MediaDeviceInfo[] = [];
  selectedAudioDevice: string = '';
  selectedVideoDevice: string = '';
  
  currentDevices: any = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private meetingService: MeetingService
  ) {}

  async ngOnInit(): Promise<void> {
    this.meetingId = this.route.snapshot.paramMap.get('id') || '';
    await this.initializeMedia();
  }

  async initializeMedia(): Promise<void> {
    try {
      await this.getMediaDevices();
      await this.startLocalVideo();
    } catch (error) {
      console.error('Failed to initialize media:', error);
      this.error = 'Failed to access camera or microphone. Please check permissions.';
    }
  }

  async getMediaDevices(): Promise<void> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      this.audioDevices = devices.filter(device => device.kind === 'audioinput');
      this.videoDevices = devices.filter(device => device.kind === 'videoinput');
      
      if (this.audioDevices.length > 0) {
        this.selectedAudioDevice = this.audioDevices[0].deviceId;
      }
      
      if (this.videoDevices.length > 0) {
        this.selectedVideoDevice = this.videoDevices[0].deviceId;
      }

      this.currentDevices = {
        audioDevice: this.audioDevices[0]?.label || 'Default Microphone',
        videoDevice: this.videoDevices[0]?.label || 'Default Camera'
      };
    } catch (error) {
      console.error('Failed to get media devices:', error);
    }
  }

  async startLocalVideo(): Promise<void> {
    try {
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => track.stop());
      }

      const constraints: MediaStreamConstraints = {
        audio: this.isAudioEnabled ? { deviceId: this.selectedAudioDevice } : false,
        video: this.isVideoEnabled ? { 
          deviceId: this.selectedVideoDevice,
          width: { ideal: 640 },
          height: { ideal: 480 }
        } : false
      };

      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      const videoElement = document.querySelector('#localVideo') as HTMLVideoElement;
      if (videoElement && this.localStream) {
        videoElement.srcObject = this.localStream;
      }
    } catch (error) {
      console.error('Failed to start local video:', error);
      this.error = 'Failed to access camera or microphone.';
    }
  }

  toggleAudio(): void {
    this.isAudioEnabled = !this.isAudioEnabled;
    this.updateAudioPreview();
  }

  toggleVideo(): void {
    this.isVideoEnabled = !this.isVideoEnabled;
    this.updateVideoPreview();
  }

  updateAudioPreview(): void {
    if (this.localStream) {
      const audioTracks = this.localStream.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = this.isAudioEnabled;
      });
    }
    this.startLocalVideo();
  }

  updateVideoPreview(): void {
    if (this.localStream) {
      const videoTracks = this.localStream.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = this.isVideoEnabled;
      });
    }
    this.startLocalVideo();
  }

  openSettings(): void {
    this.showSettings = true;
  }

  closeSettings(): void {
    this.showSettings = false;
  }

  async changeVideoDevice(): Promise<void> {
    await this.startLocalVideo();
    this.currentDevices.videoDevice = this.videoDevices.find(d => d.deviceId === this.selectedVideoDevice)?.label || 'Default Camera';
  }

  async changeAudioDevice(): Promise<void> {
    await this.startLocalVideo();
    this.currentDevices.audioDevice = this.audioDevices.find(d => d.deviceId === this.selectedAudioDevice)?.label || 'Default Microphone';
  }

  async joinMeeting(): Promise<void> {
    if (!this.participantName.trim()) {
      this.error = 'Please enter your name';
      return;
    }

    const targetMeetingId = this.meetingId || this.meetingIdInput;
    if (!targetMeetingId.trim()) {
      this.error = 'Please enter a meeting ID';
      return;
    }

    this.isJoining = true;
    this.error = '';

    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      await this.meetingService.joinMeeting(targetMeetingId.trim(), this.participantName.trim());
      
      this.router.navigate(['/meeting', targetMeetingId], {
        queryParams: {
          name: this.participantName,
          audio: this.isAudioEnabled,
          video: this.isVideoEnabled
        }
      });
    } catch (error) {
      console.error('Failed to join meeting:', error);
      this.error = 'Failed to join meeting. Please check the meeting ID and try again.';
    } finally {
      this.isJoining = false;
    }
  }

  ngOnDestroy(): void {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
    }
  }
}