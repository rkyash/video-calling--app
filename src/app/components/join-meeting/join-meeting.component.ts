import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MeetingService } from '../../services/meeting.service';
import { ConfigService } from 'src/app/services/config.service';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-join-meeting',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './join-meeting.component.html',
  styleUrls: ['./join-meeting.component.scss']
})
export class JoinMeetingComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('localVideo') localVideoRef!: ElementRef<HTMLVideoElement>;
  meetingId: string = '';
  originSiteUrl!: string;
  private messageCount = 0;
  private maxMessages = 1000;

  meetingIdInput: string = '';
  participantName: string = '';
  isJoining: boolean = false;
  error: string = '';

  isAudioEnabled: boolean = true;
  isVideoEnabled: boolean = false; // Default video disabled as requested
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
    private cdr: ChangeDetectorRef,
    private configService: ConfigService,
    private authService: AuthService
  ) { }

  async ngOnInit(): Promise<void> {
    this.meetingId = this.route.snapshot.paramMap.get('id') || '';
    await this.configService.loadConfig();
    this.originSiteUrl = this.configService.getConfig()?.originSiteUrl ?? '';

    // Set up message listener immediately
    window.addEventListener('message', this.receiveMessage.bind(this));

    // Send ready message both on init and after window load
    // this.sendReadyMessage();
    // window.onload = () => this.sendReadyMessage();

    this.authService.loadUserProfile();
    var currentUser = this.authService.currentUser();

    this.participantName = currentUser?.fullName || '';
  }

  async ngAfterViewInit(): Promise<void> {
    // Add a small delay to ensure ViewChild is properly initialized
    setTimeout(async () => {
      console.log('ngAfterViewInit - initializing media');
      await this.initializeMedia();
    }, 100);
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
      const authToken = event.data;

      if (authToken) {
        console.log('Site B: Received message', authToken);
        this.authService.setAuthToken(authToken);

        // Send acknowledgment back to Site A
        window.opener.postMessage('token_received', this.originSiteUrl);

        // Remove the event listener after successful processing
        window.removeEventListener('message', this.receiveMessage);

        this.authService.loadUserProfile();

        var currentUser = this.authService.currentUser();

        this.participantName = currentUser?.fullName || '';
        // this.router.navigate([`/meeting/${this.meetingId}/join`]);
      }
    }
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

      // console.log('Requesting media with constraints:', constraints);
      // console.log('Video enabled:', this.isVideoEnabled);
      // console.log('Audio enabled:', this.isAudioEnabled);

      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      // console.log('Got media stream:', this.localStream);
      // console.log('Video tracks:', this.localStream.getVideoTracks().length);
      // console.log('Audio tracks:', this.localStream.getAudioTracks().length);

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

      // Create join settings based on current preferences
      const joinSettings = {
        audioEnabled: this.isAudioEnabled,
        videoEnabled: this.isVideoEnabled,
        autoMuteAudio: false,
        autoMuteVideo: false
      };

      await this.meetingService.joinMeeting(targetMeetingId.trim(), this.participantName.trim());

      this.router.navigate(['/meeting', targetMeetingId], {
        queryParams: {
          name: this.participantName,
          audio: this.isAudioEnabled,
          video: this.isVideoEnabled,
          joinAudio: this.isAudioEnabled,
          joinVideo: this.isVideoEnabled
        }
      });
    } catch (error) {
      console.error('Failed to join meeting:', error);
      this.error = 'Failed to join meeting. Please check the meeting ID and try again.';
    } finally {
      this.isJoining = false;
      this.participantName=''
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
    this.participantName="";
    window.removeEventListener(
      'message',
      this.receiveMessage.bind(this)
    );
  }
}