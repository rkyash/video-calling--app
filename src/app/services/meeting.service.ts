import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Meeting, ChatMessage } from '../models/meeting.model';
import { v4 as uuidv4 } from 'uuid';

@Injectable({
  providedIn: 'root'
})
export class MeetingService {
  private currentMeetingSubject = new BehaviorSubject<Meeting | null>(null);
  private chatMessagesSubject = new BehaviorSubject<ChatMessage[]>([]);
  private isRecordingSubject = new BehaviorSubject<boolean>(false);

  public currentMeeting$ = this.currentMeetingSubject.asObservable();
  public chatMessages$ = this.chatMessagesSubject.asObservable();
  public isRecording$ = this.isRecordingSubject.asObservable();

  private chatMessages: ChatMessage[] = [];

  constructor() {}

  createMeeting(hostName: string, meetingName: string): Meeting {
    const meeting: Meeting = {
      id: uuidv4(),
      name: meetingName,
      hostId: uuidv4(),
      sessionId: this.generateSessionId(),
      token: this.generateToken(),
      apiKey: this.getApiKey(),
      createdAt: new Date(),
      isRecording: false
    };

    this.currentMeetingSubject.next(meeting);
    this.addSystemMessage(`${hostName} created the meeting`);
    
    return meeting;
  }

  joinMeeting(meetingId: string, participantName: string): Promise<Meeting> {
    return new Promise((resolve, reject) => {
      const meeting = this.getMeetingById(meetingId);
      if (meeting) {
        this.currentMeetingSubject.next(meeting);
        this.addSystemMessage(`${participantName} joined the meeting`);
        resolve(meeting);
      } else {
        reject(new Error('Meeting not found'));
      }
    });
  }

  private getMeetingById(meetingId: string): Meeting | null {
    const mockMeeting: Meeting = {
      id: meetingId,
      name: 'Sample Meeting',
      hostId: uuidv4(),
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
    return '47862271';
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
      currentMeeting.isRecording = true;
      this.currentMeetingSubject.next(currentMeeting);
      this.isRecordingSubject.next(true);
      this.addSystemMessage('Recording started');
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
}