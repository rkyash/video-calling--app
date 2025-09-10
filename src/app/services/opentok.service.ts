import { Injectable, Inject, forwardRef } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Participant } from '../models/meeting.model';
import * as OT from '@opentok/client';

@Injectable({
  providedIn: 'root'
})
export class OpenTokService {
  private session: OT.Session | null = null;
  private publisher: OT.Publisher | null = null;
  private screenPublisher: OT.Publisher | null = null;
  private subscribers: Map<string, OT.Subscriber> = new Map();
  
  private participantsSubject = new BehaviorSubject<Participant[]>([]);
  private connectionStatusSubject = new BehaviorSubject<string>('disconnected');
  private errorSubject = new BehaviorSubject<string | null>(null);

  public participants$ = this.participantsSubject.asObservable();
  public connectionStatus$ = this.connectionStatusSubject.asObservable();
  public error$ = this.errorSubject.asObservable();

  private participants: Participant[] = [];
  private currentUser: Participant | null = null;

  private meetingService: any = null;
  private joinSettings: { audioEnabled?: boolean, videoEnabled?: boolean } = {};

  constructor() {}

  // Method to set meeting service to avoid circular dependency
  setMeetingService(meetingService: any): void {
    this.meetingService = meetingService;
  }

  initializeSession(apiKey: string, sessionId: string, token: string, userName: string, isHost:boolean, joinSettings?: { audioEnabled?: boolean, videoEnabled?: boolean }): Promise<void> {
    // Store join settings for use during stream publishing
    this.joinSettings = joinSettings || { audioEnabled: true, videoEnabled: true };
    
    return new Promise((resolve, reject) => {
      try {
        this.session = OT.initSession(apiKey, sessionId);
        
        this.session.on('sessionConnected', () => {
          this.connectionStatusSubject.next('connected');
          this.publishStream(userName,isHost);
          
          // Auto-start recording when session connects and user is host
          if (isHost && this.meetingService) {
            setTimeout(() => {
              this.meetingService.startRecording();
            }, 2000); // Wait 2 seconds for session to stabilize
          }
          
          resolve();
        });

        this.session.on('sessionDisconnected', () => {
          this.connectionStatusSubject.next('disconnected');
          this.cleanup();
        });

        this.session.on('streamCreated', (event) => {
          this.subscribeToStream(event.stream,isHost);
        });

        this.session.on('streamDestroyed', (event) => {
          this.removeParticipant(event.stream.connection.connectionId);
        });

        this.session.on('connectionCreated', (event) => {
          this.addParticipant(event.connection,isHost);
        });

        this.session.on('connectionDestroyed', (event) => {
          this.removeParticipant(event.connection.connectionId);
        });

        this.session.on('signal', (event) => {
          this.handleSignal(event);
        });

        this.session.connect(token, (error) => {
          if (error) {
            this.errorSubject.next('Failed to connect to session');
            reject(error);
          }
        });
      } catch (error) {
        this.errorSubject.next('Failed to initialize session');
        reject(error);
      }
    });
  }

  private publishStream(userName: string,isHost:boolean): void {
    const publisherContainer = document.getElementById('publisher');
    
    if (!publisherContainer) {
      console.error('Publisher container not found');
      return;
    }
    
    // Use join settings to determine initial audio/video state
    const publishAudio = this.joinSettings.audioEnabled !== false;
    const publishVideo = this.joinSettings.videoEnabled !== false;
    
    this.publisher = OT.initPublisher(publisherContainer, {
      name: userName,
      width: '100%',
      height: '100%',
      insertMode: 'append',
      showControls: false,
      publishAudio: publishAudio,
      publishVideo: publishVideo
    });

    if (this.session && this.publisher) {
      this.session.publish(this.publisher);
      
      // Set initial muted state based on join settings (opposite of enabled)
      const initialAudioMuted = this.joinSettings.audioEnabled === false;
      const initialVideoMuted = this.joinSettings.videoEnabled === false;
      
      this.currentUser = {
        id: this.session.connection?.connectionId || 'local',
        name: userName,
        isHost: isHost,
        isAudioMuted: initialAudioMuted,
        isVideoMuted: initialVideoMuted,
        isScreenSharing: false,
        hasRaisedHand: false,
        connectionId: this.session.connection?.connectionId || 'local'
      };
      
      this.participants.push(this.currentUser);
      this.participantsSubject.next([...this.participants]);
    }
  }

  private subscribeToStream(stream: OT.Stream,isHost:boolean): void {
    const subscriberContainer = document.getElementById(`subscriber-${stream.connection.connectionId}`);
    
    if (!subscriberContainer) {
      console.error(`Subscriber container not found for ${stream.connection.connectionId}`);
      return;
    }
    
    const subscriber = this.session?.subscribe(stream, subscriberContainer, {
      width: '100%',
      height: '100%',
      insertMode: 'append',
      showControls: false
    });

    if (subscriber) {
      this.subscribers.set(stream.connection.connectionId, subscriber);
      this.addParticipant(stream.connection,isHost);
    }
  }

  private addParticipant(connection: OT.Connection,isHost:boolean): void {
    console.log('Adding participant:', connection);
    const existingParticipant = this.participants.find(p => p.connectionId === connection.connectionId);
    if (!existingParticipant) {
      const participant: Participant = {
        id: connection.connectionId,
        name: connection.data ? JSON.parse(connection.data).name || 'Unknown' : 'Unknown',
        isHost: isHost,
        isAudioMuted: false,
        isVideoMuted: false,
        isScreenSharing: false,
        hasRaisedHand: false,
        connectionId: connection.connectionId
      };
      
      this.participants.push(participant);
      this.participantsSubject.next([...this.participants]);
    }
  }

  private removeParticipant(connectionId: string): void {
    const leavingParticipant = this.participants.find(p => p.connectionId === connectionId);
    this.participants = this.participants.filter(p => p.connectionId !== connectionId);
    
    // If host is leaving, disconnect all participants and end the meeting
    if (leavingParticipant?.isHost) {
      this.endMeetingForAll();
      return;
    }
    
    this.participantsSubject.next([...this.participants]);
    
    const subscriber = this.subscribers.get(connectionId);
    if (subscriber) {
      // subscriber.destroy();
      this.subscribers.delete(connectionId);
    }
  }

  private handleSignal(event: any): void {
    const data = JSON.parse(event.data || '{}');
    
    switch (event.type) {
      case 'signal:raiseHand':
        this.updateParticipant(event.from?.connectionId || '', { hasRaisedHand: data.raised });
        break;
      case 'signal:muteAudio':
        this.updateParticipant(event.from?.connectionId || '', { isAudioMuted: data.muted });
        break;
      case 'signal:muteVideo':
        this.updateParticipant(event.from?.connectionId || '', { isVideoMuted: data.muted });
        break;
      case 'signal:screenShare':
        this.updateParticipant(event.from?.connectionId || '', { isScreenSharing: data.sharing });
        break;
      case 'signal:chat':
        // Handle incoming chat messages
        this.handleChatMessage(data, event.from?.connectionId);
        break;
      case 'signal:hostLeft':
        // Host has left, end meeting for all participants
        this.endMeetingForAll();
        break;
    }
  }

  private updateParticipant(connectionId: string, updates: Partial<Participant>): void {
    const participantIndex = this.participants.findIndex(p => p.connectionId === connectionId);
    if (participantIndex !== -1) {
      this.participants[participantIndex] = { ...this.participants[participantIndex], ...updates };
      this.participantsSubject.next([...this.participants]);
    }
  }

  private handleChatMessage(data: any, fromConnectionId?: string): void {
    if (this.meetingService && data.message && data.senderName) {
      // Don't handle chat messages from the current user - they already added it locally
      if (this.currentUser && data.senderName === this.currentUser.name) {
        return;
      }

      // Find the sender's connection ID to use as participant ID
      const senderConnectionId = this.participants.find(p => p.name === data.senderName)?.connectionId || fromConnectionId || 'unknown';
      
      this.meetingService.addChatMessage(
        senderConnectionId,
        data.senderName,
        data.message
      );
    }
  }

  private endMeetingForAll(): void {
    // Notify all participants that host has left and meeting is ending
    this.errorSubject.next('Host has left the meeting. Meeting ended.');
    
    // Signal to all participants that host has left and meeting is ending
    this.sendSignal('hostLeft', { message: 'Host has left the meeting. Meeting ended.' });
    
    // Disconnect the current session after a brief delay to allow signal to be sent
    setTimeout(() => {
      this.disconnect();
    }, 1000);
  }

  toggleAudio(): void {
    if (this.publisher && this.currentUser) {
      const isCurrentlyMuted = this.currentUser.isAudioMuted;
      this.publisher.publishAudio(isCurrentlyMuted);
      
      this.currentUser.isAudioMuted = !isCurrentlyMuted;
      this.sendSignal('muteAudio', { muted: !isCurrentlyMuted });
      this.participantsSubject.next([...this.participants]);
    }
  }

  toggleVideo(): void {
    if (this.publisher && this.currentUser) {
      const isCurrentlyMuted = this.currentUser.isVideoMuted;
      this.publisher.publishVideo(isCurrentlyMuted);
      
      this.currentUser.isVideoMuted = !isCurrentlyMuted;
      this.sendSignal('muteVideo', { muted: !isCurrentlyMuted });
      this.participantsSubject.next([...this.participants]);
    }
  }

  async startScreenSharing(): Promise<void> {
    try {
      // Don't replace the camera publisher - create a separate screen publisher
      if (this.screenPublisher) {
        this.session?.unpublish(this.screenPublisher);
      }

      // First set screen sharing state to trigger layout change
      if (this.currentUser) {
        this.currentUser.isScreenSharing = true;
        this.sendSignal('screenShare', { 
          sharing: true, 
          streamId: 'pending' 
        });
        this.participantsSubject.next([...this.participants]);
      }

      // Wait for the DOM to update with the new layout, then find container
      let screenShareContainer: HTMLElement | null = null;
      
      try {
        await this.waitForScreenShareContainer();
        screenShareContainer = document.getElementById('screen-share-publisher');
      } catch (error) {
        console.warn('DOM container approach failed, trying fallback approach:', error);
      }
      
      // Fallback: create a temporary container if the DOM one isn't available
      if (!screenShareContainer) {
        screenShareContainer = this.createFallbackScreenShareContainer();
      }

      this.screenPublisher = OT.initPublisher(screenShareContainer, {
        videoSource: 'screen',
        publishAudio: false, // Use microphone from camera stream
        publishVideo: true,
        width: '100%',
        height: '100%',
        insertMode: 'append',
        showControls: false,
        name: `${this.currentUser?.name || 'User'} - Screen Share`
      });

      if (this.session && this.screenPublisher) {
        this.session.publish(this.screenPublisher);
        
        // Listen for screen share ended (when user stops sharing via browser UI)
        this.screenPublisher.on('streamDestroyed', () => {
          this.stopScreenSharing();
        });

        // Update the signal with the actual stream ID now that it's available
        if (this.currentUser) {
          this.sendSignal('screenShare', { 
            sharing: true, 
            streamId: this.screenPublisher.stream?.streamId 
          });
        }
      }
    } catch (error) {
      this.errorSubject.next('Failed to start screen sharing. Please allow screen sharing permission.');
      throw error;
    }
  }

  stopScreenSharing(): void {
    if (this.screenPublisher && this.currentUser?.isScreenSharing) {
      // Stop the screen sharing publisher without affecting camera stream
      this.session?.unpublish(this.screenPublisher);
      this.screenPublisher = null;
      
      // Remove screen share containers (both regular and fallback)
      const screenShareContainer = document.getElementById('screen-share-publisher');
      const fallbackContainer = document.getElementById('screen-share-publisher-fallback');
      
      if (screenShareContainer) {
        screenShareContainer.innerHTML = ''; // Clear content but keep container for future use
      }
      if (fallbackContainer) {
        fallbackContainer.remove(); // Remove fallback container completely
      }

      if (this.currentUser) {
        this.currentUser.isScreenSharing = false;
        this.sendSignal('screenShare', { sharing: false });
        this.participantsSubject.next([...this.participants]);
      }
    }
  }

  raiseHand(): void {
    if (this.currentUser) {
      this.currentUser.hasRaisedHand = !this.currentUser.hasRaisedHand;
      this.sendSignal('raiseHand', { raised: this.currentUser.hasRaisedHand });
    }
  }

  private sendSignal(type: string, data: any): void {
    if (this.session) {
      this.session.signal({
        type: type,
        data: JSON.stringify(data)
      });
    }
  }

  sendChatMessage(message: string): void {
    if (this.session && this.currentUser) {
      this.session.signal({
        type: 'chat',
        data: JSON.stringify({
          message: message,
          senderName: this.currentUser.name,
          timestamp: new Date().toISOString()
        })
      });
    }
  }

  muteParticipant(connectionId: string): void {
    this.session?.signal({
      type: 'forceUnpublishAudio',
      to: (this.session as any).connections?.find((c: any) => c.connectionId === connectionId)
    });
  }

  removeParticipantFromCall(connectionId: string): void {
    const connection = (this.session as any)?.connections?.find((c: any) => c.connectionId === connectionId);
    if (connection) {
      (this.session as any)?.forceDisconnect(connection, (error: any) => {
        if (error) {
          console.error('Failed to remove participant:', error);
        }
      });
    }
  }

  getPublisherElement(): HTMLElement | null {
    return this.publisher?.element || null;
  }

  getSubscriberElement(connectionId: string): HTMLElement | null {
    const subscriber = this.subscribers.get(connectionId);
    return subscriber?.element || null;
  }

  disconnect(): void {
    if (this.session) {
      this.session.disconnect();
    }
    this.cleanup();
  }

  private async waitForScreenShareContainer(maxWait: number = 2000): Promise<void> {
    const startTime = Date.now();
    return new Promise((resolve, reject) => {
      const checkForContainer = () => {
        const container = document.getElementById('screen-share-publisher');
        if (container) {
          console.log('Screen share container found after', Date.now() - startTime, 'ms');
          resolve();
        } else if (Date.now() - startTime > maxWait) {
          console.error('Screen share container not found after', maxWait, 'ms');
          reject(new Error('Screen share container not found within timeout'));
        } else {
          setTimeout(checkForContainer, 50); // Check more frequently
        }
      };
      
      // Start checking after a small delay to allow Angular to render
      setTimeout(checkForContainer, 100);
    });
  }

  private createFallbackScreenShareContainer(): HTMLElement {
    console.log('Creating fallback screen share container');
    const container = document.createElement('div');
    container.id = 'screen-share-publisher-fallback';
    container.style.width = '100%';
    container.style.height = '100%';
    container.style.position = 'absolute';
    container.style.top = '0';
    container.style.left = '0';
    container.style.zIndex = '1000';
    container.style.backgroundColor = '#000';
    
    // Try to append to screen share element if it exists
    const screenShareElement = document.querySelector('.screen-share-element');
    if (screenShareElement) {
      screenShareElement.appendChild(container);
    } else {
      // Fallback to body
      document.body.appendChild(container);
    }
    
    return container;
  }

  private cleanup(): void {
    this.publisher = null;
    this.screenPublisher = null;
    this.session = null;
    this.subscribers.clear();
    this.participants = [];
    this.currentUser = null;
    this.participantsSubject.next([]);
    this.connectionStatusSubject.next('disconnected');
  }

  getCurrentUser(): Participant | null {
    return this.currentUser;
  }
}