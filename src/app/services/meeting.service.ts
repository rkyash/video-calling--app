import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import {
  Meeting,
  ChatMessage,
  CreateMeetingRequest,
  MeetingData,
  JoinMeetingRequest,
  JoinMeetingData,
  ParticipantRole,
  RecordingRequest
} from '../models/meeting.model';
import { ApiResponseHandler } from '../models/api-response.model';
import { ApiService } from './api.service';
import { ToastService } from './toast.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable({
  providedIn: 'root'
})
export class MeetingService {
  private currentMeetingSubject = new BehaviorSubject<Meeting | null>(null);
  private currentMeetingDataSubject = new BehaviorSubject<MeetingData | null>(null);
  private currentJoinDataSubject = new BehaviorSubject<JoinMeetingData | null>(null);
  private chatMessagesSubject = new BehaviorSubject<ChatMessage[]>([]);
  private isRecordingSubject = new BehaviorSubject<boolean>(false);

  public currentMeeting$ = this.currentMeetingSubject.asObservable();
  public currentMeetingData$ = this.currentMeetingDataSubject.asObservable();
  public currentJoinData$ = this.currentJoinDataSubject.asObservable();
  public chatMessages$ = this.chatMessagesSubject.asObservable();
  public isRecording$ = this.isRecordingSubject.asObservable();

  private chatMessages: ChatMessage[] = [];

  private participantRole = ParticipantRole; // Expose enum to template if needed
  constructor(
    private apiService: ApiService,
    private toastService: ToastService
  ) { }

  createMeeting(hostName: string, meetingName: string, scheduledAt?: string): Observable<MeetingData | null> {
    const meetingRequest: CreateMeetingRequest = {
      title: meetingName,
      description: null,
      scheduledAt: scheduledAt || new Date().toISOString(),
      createdById: 1, // TODO: Get from auth service
      isRecordingEnabled: false,
      isScreenSharingEnabled: true,
      maxParticipants: 20,
      roomCode: null
    };

    return new Observable<MeetingData | null>(observer => {
      this.apiService.createMeeting(meetingRequest).subscribe({
        next: (response) => {
          if (ApiResponseHandler.isSuccess(response)) {
            const meetingData = ApiResponseHandler.extractData(response);
            if (meetingData) {
              this.currentMeetingDataSubject.next(meetingData);

              // Create legacy Meeting object for backward compatibility
              const legacyMeeting: Meeting = {
                id: meetingData.roomCode.toString(),
                name: meetingData.title,
                isHost: true,
                hostId: meetingData.createdById?.toString() || '',
                sessionId: meetingData.sessionId,
                token: this.generateToken(),
                apiKey: this.getApiKey(),
                createdAt: new Date(meetingData.createdAt),
                isRecording: meetingData.isRecordingEnabled
              };

              this.currentMeetingSubject.next(legacyMeeting);
              this.addSystemMessage(`${hostName} created the meeting "${meetingData.title}"`);

              observer.next(meetingData);
              observer.complete();
            } else {
              const errorMessage = 'Failed to create meeting: Invalid response data';
              console.error(errorMessage);
              this.toastService.error('Create Failed', errorMessage);
              this.addSystemMessage(errorMessage);
              observer.error(new Error(errorMessage));
            }
          } else {
            const errorMessage = ApiResponseHandler.getErrorMessage(response);
            console.error('Failed to create meeting:', errorMessage);
            this.toastService.error('Create Failed', errorMessage);
            this.addSystemMessage(`Failed to create meeting: ${errorMessage}`);
            observer.error(new Error(errorMessage));
          }
        },
        error: (error) => {
          console.error('API error creating meeting:', error);
          const errorMessage = this.getErrorMessage(error);
          this.toastService.error('Create Failed', errorMessage);
          this.addSystemMessage('Failed to create meeting due to network error');
          observer.error(new Error(errorMessage));
        }
      });
    });
  }

  joinMeeting(roomCode: string, participantName: string, isGuest: boolean = false): Observable<JoinMeetingData | null> {
    const joinRequest: JoinMeetingRequest = isGuest
      ? { guestName: participantName }
      : { userName: participantName };

    return new Observable<JoinMeetingData | null>(observer => {
      this.apiService.joinMeeting(roomCode, joinRequest).subscribe({
        next: (response) => {
          if (ApiResponseHandler.isSuccess(response)) {
            const joinData = ApiResponseHandler.extractData(response);
            if (joinData) {
              this.currentJoinDataSubject.next(joinData);

              // Create legacy Meeting object for backward compatibility
              const legacyMeeting: Meeting = {
                id: roomCode,
                name: `Meeting ${joinData.meetingId}`,
                hostId: joinData.userId?.toString() || '',
                isHost: joinData.role === this.participantRole.Host, // Assuming role 0 is Host
                sessionId: joinData.sessionId || this.generateSessionId(),
                token: joinData.token || this.generateToken(),
                apiKey: joinData.apiKey || this.getApiKey(),
                createdAt: new Date(joinData.joinedAt),
                isRecording: false
              };

              this.currentMeetingSubject.next(legacyMeeting);
              this.addSystemMessage(`${participantName} joined the meeting`);

              observer.next(joinData);
              observer.complete();
            } else {
              const errorMessage = 'Failed to join meeting: Invalid response data';
              console.error(errorMessage);
              this.toastService.error('Join Failed', errorMessage);
              this.addSystemMessage(errorMessage);
              observer.error(new Error(errorMessage));
            }
          } else {
            const errorMessage = ApiResponseHandler.getErrorMessage(response);
            console.error('Failed to join meeting:', errorMessage);
            this.toastService.error('Join Failed', errorMessage);
            this.addSystemMessage(`Failed to join meeting: ${errorMessage}`);
            observer.error(new Error(errorMessage));
          }
        },
        error: (error) => {
          console.error('API error joining meeting:', error);
          const errorMessage = this.getErrorMessage(error);
          this.toastService.error('Connection Failed', errorMessage);
          this.addSystemMessage('Failed to join meeting due to network error');
          observer.error(new Error(errorMessage));
        }
      });
    });
  }

  private getMeetingById(meetingId: string): Meeting | null {
    const mockMeeting: Meeting = {
      id: meetingId,
      name: 'Sample Meeting',
      hostId: uuidv4(),
      isHost: false,
      sessionId: this.generateSessionId(),
      token: this.generateToken(),
      apiKey: this.getApiKey(),
      createdAt: new Date(),
      isRecording: false
    };

    return mockMeeting;
  }

  private generateSessionId(): string {
    return '2_MX4' + uuidv4().replace(/-/g, '') + '~';
  }

  private generateToken(): string {
    return 'T1==' + btoa(JSON.stringify({
      session_id: this.generateSessionId(),
      create_time: Date.now(),
      expire_time: Date.now() + (24 * 60 * 60 * 1000),
      nonce: Math.random().toString(36).substr(2, 9),
      role: 'publisher'
    }));
  }

  private getApiKey(): string {
    return '29c22761-ff53-4827-98b5-6906c3644d9f';
  }

  private getErrorMessage(error: any): string {
    if (error?.error?.message) {
      return error.error.message;
    }
    if (error?.message) {
      return error.message;
    }
    if (error?.status === 0) {
      return 'Unable to connect to server. Please check your internet connection.';
    }
    if (error?.status === 404) {
      return 'Meeting not found. Please check the meeting ID.';
    }
    if (error?.status === 403) {
      return 'Access denied. You may not have permission to join this meeting.';
    }
    if (error?.status >= 500) {
      return 'Server error. Please try again later.';
    }
    return 'An unexpected error occurred. Please try again.';
  }

  addChatMessage(participantId: string, participantName: string, message: string): void {
    const chatMessage: ChatMessage = {
      id: uuidv4(),
      participantId,
      participantName,
      message,
      timestamp: new Date(),
      type: 'text'
    };

    this.chatMessages.push(chatMessage);
    this.chatMessagesSubject.next([...this.chatMessages]);
  }

  private addSystemMessage(message: string): void {
    const systemMessage: ChatMessage = {
      id: uuidv4(),
      participantId: 'system',
      participantName: 'System',
      message,
      timestamp: new Date(),
      type: 'system'
    };

    this.chatMessages.push(systemMessage);
    this.chatMessagesSubject.next([...this.chatMessages]);
  }

  startRecording(): void {
    const currentMeeting = this.currentMeetingSubject.value;
    if (currentMeeting) {
      const recordingRequest: RecordingRequest = {
        sessionId: currentMeeting.sessionId
      };

      this.apiService.startRecording(currentMeeting.id, recordingRequest).subscribe({
        next: (response) => {
          if (response.success) {
            currentMeeting.isRecording = true;
            this.currentMeetingSubject.next(currentMeeting);
            this.isRecordingSubject.next(true);
            this.addSystemMessage('Recording started');
            this.toastService.success('Recording Started', 'Meeting recording has started successfully');
          } else {
            this.toastService.error('Recording Failed', 'Failed to start recording');
            this.addSystemMessage('Failed to start recording');
          }
        },
        error: (error) => {
          console.error('Failed to start recording:', error);
          this.toastService.error('Recording Failed', 'Failed to start recording - please reconnect');
          this.addSystemMessage('Failed to start recording - please reconnect if needed');

          // Show confirmation dialog to reconnect
          this.showRecordingFailureDialog();
        }
      });
    }
  }

  stopRecording(): void {
    const currentMeeting = this.currentMeetingSubject.value;
    if (currentMeeting) {
      currentMeeting.isRecording = false;
      this.currentMeetingSubject.next(currentMeeting);
      this.isRecordingSubject.next(false);
      this.addSystemMessage('Recording stopped');
    }
  }

  hostLeft(hostName: string): void {
    this.addSystemMessage(`${hostName} (Host) left the meeting. Meeting ended for all participants.`);
    this.endMeeting();
  }

  participantLeft(participantName: string): void {
    this.addSystemMessage(`${participantName} left the meeting`);
  }

  endMeeting(): void {
    this.addSystemMessage('Meeting ended');
    this.currentMeetingSubject.next(null);
    this.chatMessages = [];
    this.chatMessagesSubject.next([]);
    this.isRecordingSubject.next(false);    
  }

  getCurrentMeeting(): Meeting | null {
    return this.currentMeetingSubject.value;
  }

  getCurrentJoinData(): JoinMeetingData | null {
    return this.currentJoinDataSubject.value;
  }

  generateMeetingLink(meetingId: string): string {
    const baseUrl = window.location.origin;
    return `${baseUrl}/join/${meetingId}`;
  }

  copyMeetingLink(meetingId: string): void {
    const link = this.generateMeetingLink(meetingId);
    navigator.clipboard.writeText(link).then(() => {
      console.log('Meeting link copied to clipboard');
    }).catch(err => {
      console.error('Failed to copy meeting link', err);
    });
  }

  disconnectParticipant(): Promise<any> {
    const currentMeeting = this.currentMeetingSubject.value;
    if (currentMeeting) {
      // Call the disconnect API and return Promise
      return new Promise((resolve, reject) => {
        this.apiService.disconnectParticipant(currentMeeting.id).subscribe({
          next: (response) => {
            if (response.success) {
              console.log('Participant successfully disconnected from server');
              this.toastService.success('Participant successfully disconnected from server ' + response.message || '');
              resolve(response);
            } else {
              console.warn('Server disconnect response:', response);
              this.toastService.error('Server disconnect response:' + response.message || '');
              resolve(response); // Still resolve even if not success
            }
          },
          error: (error) => {
            console.error('Failed to disconnect from server:', error);
            this.toastService.error('Failed to disconnect from server:' + error?.message);
            // Continue with local cleanup even if API call fails
            this.performLocalCleanup();
            reject(error);
          },
          complete: () => {
            // Always perform local cleanup regardless of API response
            this.performLocalCleanup();
          }
        });
      });
    } else {
      // No current meeting, just perform local cleanup
      this.performLocalCleanup();
      return Promise.resolve(null);
    }
  }

  private performLocalCleanup(): void {
    // Clear all browser localStorage for this site
    localStorage.clear();

    // Clear sessionStorage as well
    sessionStorage.clear();

    // Reset meeting service state
    this.endMeeting();

    console.log('Local storage and meeting state cleared');
  }

  private showRecordingFailureDialog(): void {
    const shouldReconnect = confirm(
      'Recording failed to start. This might be due to a connection issue.\n\n' +
      'Would you like to try reconnecting to start recording again?\n\n' +
      'Click OK to refresh and reconnect, or Cancel to continue without recording.'
    );

    if (shouldReconnect) {
      // Reload the page to reconnect
      window.location.reload();
    }
  }
}