import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { OpenTokService } from '../../services/opentok.service';
import { MeetingService } from '../../services/meeting.service';
import { ScreenshotService } from '../../services/screenshot.service';
import { ToastService } from '../../services/toast.service';
import { SettingsModalComponent } from '../settings-modal/settings-modal.component';
import { ConfirmationModalComponent, ConfirmationModalConfig } from '../confirmation-modal/confirmation-modal.component';
import { Meeting, Participant, ChatMessage, JoinMeetingData } from '../../models/meeting.model';
import { ScreenRecordingService } from 'src/app/services/screen-reording.service';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-meeting-room',
  standalone: true,
  imports: [CommonModule, FormsModule, SettingsModalComponent, ConfirmationModalComponent],
  templateUrl: "meeting-room.component.html",
  styleUrl: "meeting-room.component.scss"
})
export class MeetingRoomComponent implements OnInit, OnDestroy {
  meetingId: string = '';
  currentMeeting: Meeting | null = null;
  currentUser: Participant | null = null;
  participants: Participant[] = [];
  remoteParticipants: Participant[] = [];
  chatMessages: ChatMessage[] = [];

  isConnecting: boolean = true;
  connectionError: string = '';
  isDisconnecting: boolean = false;
  isRecording: boolean = false;
  isScreenRecording: boolean = false;
  isChatOpen: boolean = false;
  isParticipantsOpen: boolean = false;
  isFullscreen: boolean = false;
  isSettingsOpen: boolean = false;
  showLeaveConfirmation: boolean = false;
  leaveConfirmationConfig: ConfirmationModalConfig = {
    title: 'Leave Meeting',
    message: 'Are you sure you want to leave the meeting?',
    warningText: 'You will be disconnected from the video call and removed from the meeting.',
    confirmText: 'Leave Meeting',
    cancelText: 'Cancel',
    icon: 'fas fa-sign-out-alt',
    confirmButtonType: 'danger'
  };
  isScreenShareActive: boolean = false;
  screenShareParticipant: Participant | null = null;
  isMoreMenuOpen: boolean = false;

  newMessage: string = '';
  unreadMessages: number = 0;

  // Recording timer
  recordingStartTime: Date | null = null;
  recordingDuration: string = '00:00';
  private recordingTimer: any;


  // Screen Recording timer
  screenRecordingStartTime: Date | null = null;
  screenRecordingDuration: string = '00:00';
  private screenRecordingTimer: any;

  private subscriptions: Subscription[] = [];

  isHost: boolean = false;
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private openTokService: OpenTokService,
    private meetingService: MeetingService,
    private screenshotService: ScreenshotService,
    private toastService: ToastService,
    private screenRecordingService: ScreenRecordingService,
    private cdr: ChangeDetectorRef,
    private authService: AuthService
  ) { }

  async ngOnInit(): Promise<void> {
    this.meetingId = this.route.snapshot.paramMap.get('id') || '';
    const queryParams = this.route.snapshot.queryParams;
    const participantName = queryParams['name'] || 'Anonymous';
    // const isHost = queryParams['host'] === 'true';

    const meeting = this.meetingService.getCurrentMeeting();

    this.isHost = meeting ? meeting.isHost : false;

    // Get join settings from query parameters
    const joinAudioEnabled = queryParams['joinAudio'] === 'true';
    const joinVideoEnabled = queryParams['joinVideo'] === 'true';

    // Set up the meeting service reference for chat functionality
    this.openTokService.setMeetingService(this.meetingService);

    // Set up meeting room component reference for recording status signals
    this.openTokService.setMeetingRoomComponent(this);

    // Set up click outside listener for more menu
    document.addEventListener('click', this.onDocumentClick.bind(this));

    await this.initializeMeeting(participantName, joinAudioEnabled, joinVideoEnabled);
    this.subscribeToServices();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.stopRecordingTimer();

    // Call disconnect API and clear storage when component is destroyed
    this.meetingService.disconnectParticipant().catch(error => {
      console.error('Error during component destroy disconnect:', error);
    });

    this.openTokService.disconnect();
    document.removeEventListener('click', this.onDocumentClick.bind(this));
  }

  private async initializeMeeting(participantName: string, joinAudioEnabled?: boolean, joinVideoEnabled?: boolean): Promise<void> {
    try {
      const meeting = this.meetingService.getCurrentMeeting();
      if (!meeting) {
        // Use Observable pattern for join meeting
        this.meetingService.joinMeeting(this.meetingId, participantName).subscribe({
          next: async (joinData) => {
            if (joinData) {
              // Get the legacy meeting object for OpenTok initialization
              this.currentMeeting = this.meetingService.getCurrentMeeting();
              this.isHost = this.currentMeeting ? this.currentMeeting.isHost : false;
              if (this.currentMeeting) {
                // Create join settings object
                const joinSettings = {
                  audioEnabled: joinAudioEnabled !== false,
                  videoEnabled: joinVideoEnabled !== false
                };

                await this.openTokService.initializeSession(
                  this.currentMeeting.apiKey,
                  this.currentMeeting.sessionId,
                  this.currentMeeting.token,
                  participantName,
                  this.isHost,
                  joinSettings
                );
                this.isConnecting = false;
                this.toastService.success('Meeting Joined', 'Successfully joined the meeting');
              } else {
                const errorMessage = 'Meeting not found after joining';
                console.error(errorMessage);
                this.toastService.error('Join Failed', errorMessage);
                this.connectionError = errorMessage;
                this.isConnecting = false;
              }
            } else {
              const errorMessage = 'Failed to join meeting';
              console.error(errorMessage);
              this.toastService.error('Join Failed', errorMessage);
              this.connectionError = errorMessage;
              this.isConnecting = false;
            }
          },
          error: (error) => {
            console.error('Failed to join meeting:', error);
            // Error message and toast are already handled by the service
            this.connectionError = error.message || 'Failed to join the meeting. Please check your connection and try again.';
            this.isConnecting = false;
          }
        });
      } else {
        this.currentMeeting = meeting;

        // Create join settings object
        const joinSettings = {
          audioEnabled: joinAudioEnabled !== false,
          videoEnabled: joinVideoEnabled !== false
        };

        await this.openTokService.initializeSession(
          this.currentMeeting.apiKey,
          this.currentMeeting.sessionId,
          this.currentMeeting.token,
          participantName,
          this.isHost,
          joinSettings

        );
        this.isConnecting = false;
      }
    } catch (error) {
      console.error('Failed to initialize meeting:', error);
      this.connectionError = 'Failed to connect to the meeting. Please check your connection and try again.';
      this.isConnecting = false;
    }
  }

  private subscribeToServices(): void {
    // Subscribe to participants
    const participantsSub = this.openTokService.participants$.subscribe(participants => {
      console.log('Participants updated:', participants);
      this.participants = participants;

      // Find current user in the participants array instead of getting a separate reference
      const currentUserFromService = this.openTokService.getCurrentUser();
      if (currentUserFromService) {
        this.currentUser = this.participants.find(p => p.id === currentUserFromService.id) || currentUserFromService;
      }

      this.remoteParticipants = participants.filter(p => p.id !== this.currentUser?.id);

      console.log('Current user:', this.currentUser);
      console.log('Remote participants:', this.remoteParticipants);

      // Debug video overlay visibility
      if (this.currentUser) {
        console.log('Current user video muted state:', this.currentUser.isVideoMuted);
      }
      this.remoteParticipants.forEach(p => {
        console.log(`Remote participant ${p.name} video muted:`, p.isVideoMuted);

        // Debug DOM state for each remote participant
        setTimeout(() => {
          const videoContainer = document.getElementById(`subscriber-${p.connectionId}`);
          if (videoContainer) {
            const shouldBeVisible = !p.isVideoMuted;
            const actualDisplay = window.getComputedStyle(videoContainer).display;
            console.log(`DOM check for ${p.name} (${p.connectionId}):`, {
              shouldBeVisible,
              isVideoMuted: p.isVideoMuted,
              actualDisplay,
              expectedDisplay: shouldBeVisible ? 'block' : 'none',
              matchesExpected: (shouldBeVisible && actualDisplay !== 'none') || (!shouldBeVisible && actualDisplay === 'none')
            });
          }
        }, 50);
      });

      // Check if anyone is screen sharing
      const screenSharer = participants.find(p => p.isScreenSharing);
      this.isScreenShareActive = !!screenSharer;
      this.screenShareParticipant = screenSharer || null;

      // Force Angular change detection
      this.cdr.detectChanges();
    });

    // Subscribe to chat messages
    const chatSub = this.meetingService.chatMessages$.subscribe(messages => {
      this.chatMessages = messages;
      if (!this.isChatOpen && messages.length > 0) {
        this.unreadMessages++;
      }
    });

    // Subscribe to recording status
    const recordingSub = this.meetingService.isRecording$.subscribe(isRecording => {
      this.isRecording = isRecording;

      if (isRecording) {
        this.startRecordingTimer();
      } else {
        this.stopRecordingTimer();
      }
    });

    // Subscribe to screen recording status
    const screenRecordingSub = this.screenRecordingService.isScreenRecording$.subscribe(isScreenRecording => {
      this.isScreenRecording = isScreenRecording;

      if (isScreenRecording) {
        this.startScreenRecordingTimer();
      } else {
        this.stopScreenRecordingTimer();
      }
    });

    // Subscribe to connection status
    const connectionSub = this.openTokService.connectionStatus$.subscribe(status => {
      if (status === 'disconnected' && !this.isConnecting) {
        this.connectionError = 'Connection lost. Please refresh the page.';
      }
    });

    // Subscribe to errors (including host disconnect)
    const errorSub = this.openTokService.error$.subscribe(async (error) => {
      if (error && error.includes('Host has left')) {
        // Host has left, redirect all participants to home
        alert('Host has left the meeting. The meeting has ended.');

        try {
          // Call disconnect API and clear storage
          await this.meetingService.disconnectParticipant();
        } catch (disconnectError) {
          console.error('Error during host disconnect cleanup:', disconnectError);
        }

        this.router.navigate(['/']);
      }
    });

    this.subscriptions.push(participantsSub, chatSub, recordingSub, screenRecordingSub, connectionSub, errorSub);
  }

  getVideoGridClass(): string {
    const participantCount = this.participants.length;
    if (participantCount === 1) return 'grid-1';
    if (participantCount === 2) return 'grid-2';
    if (participantCount === 3) return 'grid-3';
    if (participantCount === 4) return 'grid-4';
    return 'grid-many';
  }

  // Control Methods
  toggleAudio(): void {
    this.openTokService.toggleAudio();
  }

  toggleVideo(): void {
    console.log('Meeting room: Toggle video called');
    console.log('Before toggle - current user video muted:', this.currentUser?.isVideoMuted);
    this.openTokService.toggleVideo();

    // Force immediate state update and change detection
    setTimeout(() => {
      // Refresh current user state from service
      const updatedCurrentUser = this.openTokService.getCurrentUser();
      if (updatedCurrentUser) {
        this.currentUser = this.participants.find(p => p.id === updatedCurrentUser.id) || updatedCurrentUser;
      }

      console.log('After toggle - current user video muted:', this.currentUser?.isVideoMuted);

      // Force Angular to detect changes
      this.cdr.detectChanges();
    }, 50);
  }

  async toggleScreenShare(): Promise<void> {
    try {
      if (this.currentUser?.isScreenSharing) {
        this.openTokService.stopScreenSharing();
        this.toastService.info('Screen Share', 'Screen sharing stopped');
      } else {
        this.toastService.info('Screen Share', 'Starting screen share...');
        await this.openTokService.startScreenSharing();
        this.toastService.success('Screen Share', 'Screen sharing started successfully');
      }
    } catch (error) {
      console.error('Failed to toggle screen sharing:', error);
      let errorMessage = 'Failed to toggle screen sharing';

      if (error instanceof Error) {
        if (error.message.includes('container not found')) {
          errorMessage = 'Unable to start screen sharing. Please try again in a moment.';
        } else if (error.message.includes('permission')) {
          errorMessage = 'Screen sharing permission denied. Please allow screen sharing and try again.';
        } else {
          errorMessage = error.message;
        }
      }

      this.toastService.error('Screen Share Failed', errorMessage);
    }
  }

  async takeScreenshot(): Promise<void> {
    try {
      // const videoGrid = document.querySelector('.video-grid') as HTMLElement;
      // const screenshot = await this.screenshotService.captureVideoCall(videoGrid);
      // await this.screenshotService.shareScreenshot(screenshot, 'Meeting Screenshot');
      await this.screenshotService.takeScreenshot();
    } catch (error) {
      console.error('Failed to take screenshot:', error);
    }
  }

  toggleRaiseHand(): void {
    this.openTokService.raiseHand();
  }

  toggleChat(): void {
    this.isChatOpen = !this.isChatOpen;
    if (this.isChatOpen) {
      this.unreadMessages = 0;
      this.isParticipantsOpen = false;
      setTimeout(() => this.scrollChatToBottom(), 100);
    }
  }

  toggleParticipants(): void {
    this.isParticipantsOpen = !this.isParticipantsOpen;
    if (this.isParticipantsOpen) {
      this.isChatOpen = false;
    }
  }

  toggleRecording(): void {
    if (this.currentUser?.isHost) {
      if (this.isRecording) {
        this.meetingService.stopRecording();
        // Broadcast recording stop to all participants
        this.openTokService.broadcastRecordingStatus(false, 'Recording stopped by host');
      } else {
        this.meetingService.startRecording();
        // Broadcast recording start to all participants with the current recording start time
        this.openTokService.broadcastRecordingStatus(true, 'Recording started by host', this.recordingStartTime || new Date());
      }
    }
  }


  toggleScreenRecording(): void {
    if (this.currentUser?.isHost) {
      if (this.isScreenRecording) {
        this.screenRecordingService.stopRecording();
      } else {
        this.screenRecordingService.startRecording();
      }
    }
  }


  toggleFullscreen(): void {
    this.isFullscreen = !this.isFullscreen;
  }

  // Chat Methods
  sendMessage(): void {
    if (this.newMessage.trim() && this.currentUser) {
      // Send the signal to other participants
      this.openTokService.sendChatMessage(this.newMessage.trim());

      // Add the message locally for the sender (since we filter out our own signals)
      this.meetingService.addChatMessage(
        this.currentUser.id,
        this.currentUser.name,
        this.newMessage.trim()
      );

      this.newMessage = '';
      setTimeout(() => this.scrollChatToBottom(), 100);
    }
  }

  private scrollChatToBottom(): void {
    const chatMessagesContainer = document.querySelector('.chat-messages');
    if (chatMessagesContainer) {
      chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
    }
  }

  formatTime(timestamp: Date): string {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  // Participant Management
  muteParticipant(participant: Participant): void {
    if (this.currentUser?.isHost) {
      this.openTokService.muteParticipant(participant.connectionId);
    }
  }

  removeParticipant(participant: Participant): void {
    if (this.currentUser?.isHost) {
      this.openTokService.removeParticipantFromCall(participant.connectionId);
    }
  }

  // Utility Methods
  copyMeetingLink(): void {
    this.meetingService.copyMeetingLink(this.meetingId);
  }

  openSettings(): void {
    this.isSettingsOpen = true;
  }

  closeSettings(): void {
    this.isSettingsOpen = false;
  }

  onSettingsChange(settings: any): void {
    console.log('Settings changed:', settings);
    // Apply the new settings to the OpenTok session
    this.toastService.success('Settings Applied', 'Your settings have been updated');
  }

  toggleMoreMenu(): void {
    this.isMoreMenuOpen = !this.isMoreMenuOpen;
  }

  private onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    const moreMenuContainer = target.closest('.more-menu-container');

    if (!moreMenuContainer && this.isMoreMenuOpen) {
      this.isMoreMenuOpen = false;
    }
  }

  async retryConnection(): Promise<void> {
    this.connectionError = '';
    this.isConnecting = true;
    const queryParams = this.route.snapshot.queryParams;
    const participantName = queryParams['name'] || 'Anonymous';
    // Get join settings from query parameters
    const joinAudioEnabled = queryParams['joinAudio'] === 'true';
    const joinVideoEnabled = queryParams['joinVideo'] === 'true';
    await this.initializeMeeting(participantName, joinAudioEnabled, joinVideoEnabled);
  }

  leaveMeeting(): void {
    // Show custom confirmation modal
    this.showLeaveConfirmation = true;
  }

  onLeaveConfirm(): void {
    this.performDisconnect();
  }

  onLeaveCancel(): void {
    // Modal will be closed automatically by the component
  }

  onLeaveModalClose(): void {
    this.showLeaveConfirmation = false;
  }

  private async performDisconnect(): Promise<void> {
    // Show loading indicator
    this.isDisconnecting = true;

    try {
      console.log('Starting disconnect process...');

      // Call disconnect API and wait for response
      await this.meetingService.disconnectParticipant();
      console.log('API disconnect successful');

      // After getting API response, call participantLeft
      this.meetingService.participantLeft(this.currentUser?.name || 'Participant');

      // Disconnect from OpenTok session
      this.openTokService.disconnect();
      this.authService.logout();

      console.log('Disconnect process completed successfully');

      // Hide loading indicator before navigation
      this.isDisconnecting = false;
     
      // Close the window after successful disconnect
       setTimeout(function afterTwoSeconds() {
        window.close();
      }, 2000);
      this.router.navigate(['/']);


    } catch (error) {
      console.error('Error during disconnect:', error);

      // Even if API call fails, still perform local cleanup and close
      this.meetingService.participantLeft(this.currentUser?.name || 'Participant');
      this.openTokService.disconnect();
      this.authService.logout();

      // Hide loading indicator before navigation
      this.isDisconnecting = false;

      this.router.navigate(['/']);
    }
  }

  trackByMessageId(_index: number, message: ChatMessage): string {
    return message.id;
  }

  getParticipantInitials(name?: string): string {
    if (!name) return '?';

    const words = name.trim().split(' ');
    if (words.length === 1) {
      return words[0].substring(0, 2).toUpperCase();
    } else {
      return (words[0][0] + words[words.length - 1][0]).toUpperCase();
    }
  }

  // Recording Timer Methods
  private startRecordingTimer(): void {
    this.recordingStartTime = new Date();
    this.recordingDuration = '00:00';

    // Update timer every second
    this.recordingTimer = setInterval(() => {
      if (this.recordingStartTime) {
        const elapsed = Date.now() - this.recordingStartTime.getTime();
        this.recordingDuration = this.formatRecordingDuration(elapsed);
      }
    }, 1000);
  }

  // Synchronized recording timer that uses the host's start time
  private startSynchronizedRecordingTimer(): void {
    // Stop any existing timer
    if (this.recordingTimer) {
      clearInterval(this.recordingTimer);
      this.recordingTimer = null;
    }

    // Calculate current duration based on host's start time
    if (this.recordingStartTime) {
      const elapsed = Date.now() - this.recordingStartTime.getTime();
      this.recordingDuration = this.formatRecordingDuration(elapsed);
    } else {
      this.recordingDuration = '00:00';
    }

    // Update timer every second using host's start time
    this.recordingTimer = setInterval(() => {
      if (this.recordingStartTime) {
        const elapsed = Date.now() - this.recordingStartTime.getTime();
        this.recordingDuration = this.formatRecordingDuration(elapsed);
      }
    }, 1000);
  }

  private stopRecordingTimer(): void {
    if (this.recordingTimer) {
      clearInterval(this.recordingTimer);
      this.recordingTimer = null;
    }
    this.recordingStartTime = null;
    this.recordingDuration = '00:00';
  }

  // Screen Recording Timer Methods
  private startScreenRecordingTimer(): void {
    this.screenRecordingStartTime = new Date();
    this.screenRecordingDuration = '00:00';

    // Update timer every second
    this.screenRecordingTimer = setInterval(() => {
      if (this.screenRecordingStartTime) {
        const elapsed = Date.now() - this.screenRecordingStartTime.getTime();
        this.screenRecordingDuration = this.formatRecordingDuration(elapsed);
      }
    }, 1000);
  }

  private stopScreenRecordingTimer(): void {
    if (this.screenRecordingTimer) {
      clearInterval(this.screenRecordingTimer);
      this.recordingTimer = null;
    }
    this.screenRecordingStartTime = null;
    this.screenRecordingDuration = '00:00';
  }


  private formatRecordingDuration(milliseconds: number): string {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    const mm = minutes.toString().padStart(2, '0');
    const ss = seconds.toString().padStart(2, '0');

    // Show hours if recording is over an hour
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      const hh = hours.toString().padStart(2, '0');
      const mmm = remainingMinutes.toString().padStart(2, '0');
      return `${hh}:${mmm}:${ss}`;
    }

    return `${mm}:${ss}`;
  }

  // Handle recording status signals from other participants
  handleRecordingStatusSignal(isRecording: boolean, message: string, recordingStartTime?: string): void {
    console.log(`Received recording status signal: ${message}`, { isRecording, recordingStartTime });

    // Update local recording state to match the signal
    this.isRecording = isRecording;

    // Start or stop the recording timer based on the signal
    if (isRecording && recordingStartTime) {
      // Use the host's recording start time for synchronization
      this.recordingStartTime = new Date(recordingStartTime);
      this.startSynchronizedRecordingTimer();
      this.toastService.info('Recording', message || 'Recording started');
    } else if (isRecording) {
      // Fallback if no start time provided
      this.startRecordingTimer();
      this.toastService.info('Recording', message || 'Recording started');
    } else {
      this.stopRecordingTimer();
      this.toastService.info('Recording', message || 'Recording stopped');
    }

    // Force change detection
    this.cdr.detectChanges();
  }
}