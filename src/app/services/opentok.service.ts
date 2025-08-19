import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Participant } from '../models/meeting.model';
import * as OT from '@opentok/client';

@Injectable({
  providedIn: 'root'
})
export class OpenTokService {
  private session: OT.Session | null = null;
  private publisher: OT.Publisher | null = null;
  private subscribers: Map<string, OT.Subscriber> = new Map();
  
  private participantsSubject = new BehaviorSubject<Participant[]>([]);
  private connectionStatusSubject = new BehaviorSubject<string>('disconnected');
  private errorSubject = new BehaviorSubject<string | null>(null);

  public participants$ = this.participantsSubject.asObservable();
  public connectionStatus$ = this.connectionStatusSubject.asObservable();
  public error$ = this.errorSubject.asObservable();

  private participants: Participant[] = [];
  private currentUser: Participant | null = null;

  constructor() {}

  initializeSession(apiKey: string, sessionId: string, token: string, userName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.session = OT.initSession(apiKey, sessionId);
        
        this.session.on('sessionConnected', () => {
          this.connectionStatusSubject.next('connected');
          this.publishStream(userName);
          resolve();
        });

        this.session.on('sessionDisconnected', () => {
          this.connectionStatusSubject.next('disconnected');
          this.cleanup();
        });

        this.session.on('streamCreated', (event) => {
          this.subscribeToStream(event.stream);
        });

        this.session.on('streamDestroyed', (event) => {
          this.removeParticipant(event.stream.connection.connectionId);
        });

        this.session.on('connectionCreated', (event) => {
          this.addParticipant(event.connection);
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

  private publishStream(userName: string): void {
    const publisherElement = document.createElement('div');
    publisherElement.id = 'publisher';
    
    this.publisher = OT.initPublisher(publisherElement, {
      name: userName,
      width: '100%',
      height: '100%',
      insertMode: 'append',
      showControls: false,
      publishAudio: true,
      publishVideo: true
    });

    if (this.session) {
      this.session.publish(this.publisher);
      
      this.currentUser = {
        id: this.session.connection?.connectionId || 'local',
        name: userName,
        isHost: true,
        isAudioMuted: false,
        isVideoMuted: false,
        isScreenSharing: false,
        hasRaisedHand: false,
        connectionId: this.session.connection?.connectionId || 'local'
      };
      
      this.participants.push(this.currentUser);
      this.participantsSubject.next([...this.participants]);
    }
  }

  private subscribeToStream(stream: OT.Stream): void {
    const subscriberElement = document.createElement('div');
    subscriberElement.id = `subscriber-${stream.connection.connectionId}`;
    
    const subscriber = this.session?.subscribe(stream, subscriberElement, {
      width: '100%',
      height: '100%',
      insertMode: 'append',
      showControls: false
    });

    if (subscriber) {
      this.subscribers.set(stream.connection.connectionId, subscriber);
      this.addParticipant(stream.connection);
    }
  }

  private addParticipant(connection: OT.Connection): void {
    const existingParticipant = this.participants.find(p => p.connectionId === connection.connectionId);
    if (!existingParticipant) {
      const participant: Participant = {
        id: connection.connectionId,
        name: connection.data ? JSON.parse(connection.data).name || 'Unknown' : 'Unknown',
        isHost: false,
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
    this.participants = this.participants.filter(p => p.connectionId !== connectionId);
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
    }
  }

  private updateParticipant(connectionId: string, updates: Partial<Participant>): void {
    const participantIndex = this.participants.findIndex(p => p.connectionId === connectionId);
    if (participantIndex !== -1) {
      this.participants[participantIndex] = { ...this.participants[participantIndex], ...updates };
      this.participantsSubject.next([...this.participants]);
    }
  }

  toggleAudio(): void {
    if (this.publisher) {
      const isAudioEnabled = (this.publisher as any).stream?.hasAudio !== false;
      this.publisher.publishAudio(!isAudioEnabled);
      
      if (this.currentUser) {
        this.currentUser.isAudioMuted = isAudioEnabled;
        this.sendSignal('muteAudio', { muted: isAudioEnabled });
      }
    }
  }

  toggleVideo(): void {
    if (this.publisher) {
      const isVideoEnabled = (this.publisher as any).stream?.hasVideo !== false;
      this.publisher.publishVideo(!isVideoEnabled);
      
      if (this.currentUser) {
        this.currentUser.isVideoMuted = isVideoEnabled;
        this.sendSignal('muteVideo', { muted: isVideoEnabled });
      }
    }
  }

  async startScreenSharing(): Promise<void> {
    try {
      if (this.publisher) {
        this.session?.unpublish(this.publisher);
      }

      const publisherElement = document.createElement('div');
      publisherElement.id = 'screen-publisher';

      this.publisher = OT.initPublisher(publisherElement, {
        videoSource: 'screen',
        publishAudio: true,
        publishVideo: true,
        width: '100%',
        height: '100%',
        showControls: false
      });

      if (this.session) {
        this.session.publish(this.publisher);
        
        if (this.currentUser) {
          this.currentUser.isScreenSharing = true;
          this.sendSignal('screenShare', { sharing: true });
        }
      }
    } catch (error) {
      this.errorSubject.next('Failed to start screen sharing');
      throw error;
    }
  }

  stopScreenSharing(): void {
    if (this.publisher && this.currentUser?.isScreenSharing) {
      this.session?.unpublish(this.publisher);
      
      const publisherElement = document.createElement('div');
      publisherElement.id = 'publisher';
      
      this.publisher = OT.initPublisher(publisherElement, {
        name: this.currentUser.name,
        publishAudio: true,
        publishVideo: true,
        width: '100%',
        height: '100%',
        showControls: false
      });

      if (this.session) {
        this.session.publish(this.publisher);
        
        this.currentUser.isScreenSharing = false;
        this.sendSignal('screenShare', { sharing: false });
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

  private cleanup(): void {
    this.publisher = null;
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