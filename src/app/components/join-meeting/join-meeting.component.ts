import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit, ChangeDetectorRef } from '@angular/core';
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
                  [class.hidden]="!hasVideoStream"
                ></video>
                <div class="video-placeholder" [class.hidden]="hasVideoStream">
                  <div class="avatar">
                    <i class="fas fa-user"></i>
                  </div>
                  <p>{{ isVideoEnabled ? 'Starting camera...' : 'Camera is off' }}</p>
                </div>

                <div class="preview-controls">
                  <button 
                    class="btn btn-icon"
                    [class.btn-secondary]="!isAudioEnabled"
                    [class.btn-outline]="isAudioEnabled"
                    [class.btn-active]="hasAudioStream"
                    (click)="toggleAudio()"
                    title="Toggle Microphone"
                  >
                    <i [class]="isAudioEnabled ? 'fas fa-microphone' : 'fas fa-microphone-slash'"></i>
                  </button>

                  <button 
                    class="btn btn-icon"
                    [class.btn-secondary]="!isVideoEnabled"
                    [class.btn-outline]="isVideoEnabled"
                    [class.btn-active]="hasVideoStream"
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
                  
                  <!-- Debug button -->
                  <!-- <button 
                    class="btn btn-icon btn-outline"
                    (click)="debugVideo()"
                    title="Debug Video"
                  >
                    <i class="fas fa-bug"></i>
                  </button> -->
                </div>
              </div>

              <div class="device-info" *ngIf="currentDevices">
                <div class="device-item">
                  <i class="fas fa-microphone" [class.text-success]="hasAudioStream" [class.text-muted]="!hasAudioStream"></i>
                  <span>{{ currentDevices.audioDevice || 'Default Microphone' }}</span>
                  <span class="status-indicator" [class.active]="hasAudioStream">{{ hasAudioStream ? '● ON' : '○ OFF' }}</span>
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
          z-index: 2;
          position: relative;
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
          z-index: 1;
        }

        .hidden {
          display: none !important;
        }

        .video-placeholder .avatar {
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

        .video-placeholder p {
            color: var(--text-secondary);
            font-weight: 500;
        }

        .preview-controls {
          position: absolute;
          bottom: 1rem;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 0.5rem;
          z-index: 10;
          background: rgba(0, 0, 0, 0.7);
          padding: 0.5rem;
          border-radius: 0.5rem;
          backdrop-filter: blur(10px);

          .btn {
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            color: white;
            transition: all 0.2s ease;

            &:hover {
              background: rgba(255, 255, 255, 0.2);
              transform: translateY(-1px);
            }

            &.btn-secondary {
              background: var(--secondary-color);
              border-color: var(--secondary-color);
            }

            &.btn-outline {
              background: rgba(255, 255, 255, 0.1);
              border-color: rgba(255, 255, 255, 0.3);
              color: white;
            }
            
            &.btn-active {
              background: var(--success-color) !important;
              border-color: var(--success-color) !important;
              color: white !important;
              
              &:hover {
                background: var(--success-color) !important;
                opacity: 0.9;
              }
            }
          }
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
        
        .status-indicator {
          margin-left: auto;
          font-size: 0.75rem;
          font-weight: 500;
          color: var(--text-secondary);
          
          &.active {
            color: var(--success-color);
          }
        }
        
        .text-success {
          color: var(--success-color) !important;
        }
        
        .text-muted {
          color: var(--text-secondary) !important;
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
export class JoinMeetingComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('localVideo') localVideoRef!: ElementRef<HTMLVideoElement>;
  meetingId: string = '';
  meetingIdInput: string = '';
  participantName: string = '';
  isJoining: boolean = false;
  error: string = '';
  
  isAudioEnabled: boolean = true;
  isVideoEnabled: boolean = true;
  hasVideoStream: boolean = false; // Track if we actually have video stream
  hasAudioStream: boolean = false; // Track if we actually have audio stream
  
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
    private meetingService: MeetingService,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit(): Promise<void> {
    this.meetingId = this.route.snapshot.paramMap.get('id') || '';
  }

  async ngAfterViewInit(): Promise<void> {
    // Add a small delay to ensure ViewChild is properly initialized
    setTimeout(async () => {
      console.log('ngAfterViewInit - initializing media');
      await this.initializeMedia();
    }, 100);
  }

  async initializeMedia(): Promise<void> {
    try {
      console.log('Initializing media...');
      console.log('Video element available:', !!this.localVideoRef?.nativeElement);
      
      // First check if we can access media devices
      await this.requestMediaPermissions();
      await this.getMediaDevices();
      await this.startLocalVideo();
    } catch (error) {
      console.error('Failed to initialize media:', error);
      this.error = 'Failed to access camera or microphone. Please check permissions.';
    }
  }

  async requestMediaPermissions(): Promise<void> {
    try {
      console.log('Requesting media permissions...');
      // Request both audio and video permissions
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      });
      console.log('Media permissions granted');
      
      // Stop the temporary stream
      stream.getTracks().forEach(track => track.stop());
    } catch (error) {
      console.error('Media permissions denied or failed:', error);
      throw error;
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
      this.error = 'Failed to access media devices. Please check permissions.';
    }
  }

  async startLocalVideo(): Promise<void> {
    try {
      // Stop existing stream
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => track.stop());
        this.localStream = null;
      }

      // Reset video stream status
      this.hasVideoStream = false;
      this.error = '';

      // Only request media if at least one is enabled
      if (!this.isAudioEnabled && !this.isVideoEnabled) {
        if (this.localVideoRef?.nativeElement) {
          this.localVideoRef.nativeElement.srcObject = null;
        }
        this.hasVideoStream = false;
        return;
      }

      // If video is disabled, ensure hasVideoStream is false
      if (!this.isVideoEnabled) {
        this.hasVideoStream = false;
      }

      const constraints: MediaStreamConstraints = {
        audio: this.isAudioEnabled ? { 
          deviceId: this.selectedAudioDevice ? { exact: this.selectedAudioDevice } : undefined
        } : false,
        video: this.isVideoEnabled ? { 
          deviceId: this.selectedVideoDevice ? { exact: this.selectedVideoDevice } : undefined,
          width: { ideal: 640 },
          height: { ideal: 480 }
        } : false
      };

      console.log('Requesting media with constraints:', constraints);
      console.log('Video enabled:', this.isVideoEnabled);
      console.log('Audio enabled:', this.isAudioEnabled);
      
      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('Got media stream:', this.localStream);
      console.log('Video tracks:', this.localStream.getVideoTracks().length);
      console.log('Audio tracks:', this.localStream.getAudioTracks().length);

      // Check if we have video tracks
      if (this.isVideoEnabled && this.localStream.getVideoTracks().length > 0) {
        this.hasVideoStream = true;
        console.log('Video stream available, setting hasVideoStream = true');
        this.cdr.detectChanges(); // Force Angular change detection
        
        // Additional confirmation
        setTimeout(() => {
          if (this.hasVideoStream) {
            console.log('Confirming hasVideoStream is still true:', this.hasVideoStream);
          }
        }, 100);
      }
      
      // Check if we have audio tracks
      if (this.isAudioEnabled && this.localStream.getAudioTracks().length > 0) {
        this.hasAudioStream = true;
        console.log('Audio stream available, setting hasAudioStream = true');
      } else {
        this.hasAudioStream = false;
        console.log('No audio stream or audio disabled, setting hasAudioStream = false');
      }
      
      // Set video stream to video element
      if (this.localVideoRef?.nativeElement) {
        console.log('Setting video stream to element');
        this.localVideoRef.nativeElement.srcObject = this.localStream;
        this.localVideoRef.nativeElement.muted = true;
        
        // Wait for video metadata to load
        this.localVideoRef.nativeElement.onloadedmetadata = () => {
          console.log('Video metadata loaded');
          if (this.isVideoEnabled && this.localStream && this.localStream.getVideoTracks().length > 0) {
            this.hasVideoStream = true;
            console.log('Video stream confirmed - setting hasVideoStream = true');
            this.cdr.detectChanges();
          }
        };

        this.localVideoRef.nativeElement.oncanplay = () => {
          console.log('Video can play');
          if (this.isVideoEnabled && this.localStream && this.localStream.getVideoTracks().length > 0) {
            this.hasVideoStream = true;
            console.log('Video can play - setting hasVideoStream = true');
            this.cdr.detectChanges();
          }
        };
        
        try {
          await this.localVideoRef.nativeElement.play();
          console.log('Video element playing successfully');
        } catch (playError) {
          console.warn('Video play failed, trying again:', playError);
          // Retry after a short delay
          setTimeout(() => {
            this.localVideoRef?.nativeElement?.play().catch(e => console.error('Video play retry failed:', e));
          }, 300);
        }
      } else {
        console.warn('Video element not available, trying fallback');
        // Fallback: try to find the video element directly
        setTimeout(async () => {
          const videoElement = document.querySelector('#localVideo') as HTMLVideoElement;
          if (videoElement && this.localStream) {
            console.log('Using fallback video element');
            videoElement.srcObject = this.localStream;
            videoElement.muted = true;
            
            videoElement.onloadedmetadata = () => {
              console.log('Fallback: Video metadata loaded');
              if (this.isVideoEnabled && this.localStream && this.localStream.getVideoTracks().length > 0) {
                this.hasVideoStream = true;
                console.log('Fallback: Video stream confirmed - setting hasVideoStream = true');
                this.cdr.detectChanges();
              }
            };
            
            try {
              await videoElement.play();
              console.log('Fallback video element playing successfully');
              if (this.isVideoEnabled && this.localStream && this.localStream.getVideoTracks().length > 0) {
                this.hasVideoStream = true;
                console.log('Fallback: Video playing - setting hasVideoStream = true');
                this.cdr.detectChanges();
              }
            } catch (e) {
              console.error('Fallback video play failed:', e);
            }
          }
        }, 200);
      }
    } catch (error) {
      console.error('Failed to start local video:', error);
      this.error = 'Failed to access camera or microphone. Please check permissions and try again.';
      this.hasVideoStream = false;
      // Don't reset isVideoEnabled here, let user control it
    }
  }

  toggleAudio(): void {
    console.log('Toggling audio from', this.isAudioEnabled, 'to', !this.isAudioEnabled);
    this.isAudioEnabled = !this.isAudioEnabled;
    this.updateAudioPreview();
  }

  toggleVideo(): void {
    console.log('Toggling video from', this.isVideoEnabled, 'to', !this.isVideoEnabled);
    this.isVideoEnabled = !this.isVideoEnabled;
    this.updateVideoPreview();
  }

  async updateAudioPreview(): Promise<void> {
    if (this.localStream) {
      // If we already have a stream, just enable/disable audio tracks
      const audioTracks = this.localStream.getAudioTracks();
      console.log('Audio tracks found:', audioTracks.length);
      
      if (audioTracks.length > 0) {
        audioTracks.forEach(track => {
          track.enabled = this.isAudioEnabled;
          console.log('Audio track enabled:', track.enabled);
        });
        this.hasAudioStream = this.isAudioEnabled && audioTracks.length > 0;
        console.log('hasAudioStream set to:', this.hasAudioStream);
        this.cdr.detectChanges();
        return; // Don't restart the stream if we can just toggle existing tracks
      }
    }
    
    // If no audio tracks or no stream, restart
    await this.startLocalVideo();
  }

  async updateVideoPreview(): Promise<void> {
    if (this.localStream) {
      // If we already have a stream, just enable/disable video tracks
      const videoTracks = this.localStream.getVideoTracks();
      console.log('Video tracks found:', videoTracks.length);
      
      if (videoTracks.length > 0 && !this.isVideoEnabled) {
        // Disable video tracks but keep the stream
        videoTracks.forEach(track => {
          track.enabled = false;
        });
        this.hasVideoStream = false;
        this.cdr.detectChanges();
        return;
      } else if (videoTracks.length > 0 && this.isVideoEnabled) {
        // Enable existing video tracks
        videoTracks.forEach(track => {
          track.enabled = true;
        });
        this.hasVideoStream = true;
        this.cdr.detectChanges();
        return;
      }
    }
    
    // If no video tracks or no stream, restart
    await this.startLocalVideo();
  }

  openSettings(): void {
    this.showSettings = true;
  }

  closeSettings(): void {
    this.showSettings = false;
  }

  async changeVideoDevice(): Promise<void> {
    this.currentDevices.videoDevice = this.videoDevices.find(d => d.deviceId === this.selectedVideoDevice)?.label || 'Default Camera';
    await this.startLocalVideo();
  }

  async changeAudioDevice(): Promise<void> {
    this.currentDevices.audioDevice = this.audioDevices.find(d => d.deviceId === this.selectedAudioDevice)?.label || 'Default Microphone';
    await this.startLocalVideo();
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

  debugVideo(): void {
    console.log('=== VIDEO DEBUG INFO ===');
    console.log('isVideoEnabled:', this.isVideoEnabled);
    console.log('isAudioEnabled:', this.isAudioEnabled);
    console.log('hasVideoStream:', this.hasVideoStream);
    console.log('hasAudioStream:', this.hasAudioStream);
    console.log('localStream:', this.localStream);
    console.log('Video tracks:', this.localStream?.getVideoTracks().length || 0);
    console.log('Audio tracks:', this.localStream?.getAudioTracks().length || 0);
    console.log('Video element:', this.localVideoRef?.nativeElement);
    console.log('Video element srcObject:', this.localVideoRef?.nativeElement?.srcObject);
    console.log('Video element muted:', this.localVideoRef?.nativeElement?.muted);
    console.log('Video element paused:', this.localVideoRef?.nativeElement?.paused);
    
    // Audio tracks debug
    if (this.localStream) {
      const audioTracks = this.localStream.getAudioTracks();
      audioTracks.forEach((track, index) => {
        console.log(`Audio track ${index}:`, {
          enabled: track.enabled,
          readyState: track.readyState,
          muted: track.muted
        });
      });
    }
    
    // Try to force video to show
    if (this.localStream && this.localStream.getVideoTracks().length > 0) {
      console.log('Forcing hasVideoStream = true');
      this.hasVideoStream = true;
      this.cdr.detectChanges();
    }
    
    // Try to play video manually
    if (this.localVideoRef?.nativeElement) {
      this.localVideoRef.nativeElement.play().then(() => {
        console.log('Manual video play successful');
      }).catch(e => {
        console.error('Manual video play failed:', e);
      });
    }
  }

  ngOnDestroy(): void {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
  }
}