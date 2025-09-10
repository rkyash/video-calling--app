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

  constructor() { }

  // Method to set meeting service to avoid circular dependency
  setMeetingService(meetingService: any): void {
    this.meetingService = meetingService;
  }

  initializeSession(apiKey: string, sessionId: string, token: string, userName: string, isHost: boolean, joinSettings?: { audioEnabled?: boolean, videoEnabled?: boolean }): Promise<void> {
    // Store join settings for use during stream publishing
    this.joinSettings = joinSettings || { audioEnabled: true, videoEnabled: true };

    return new Promise((resolve, reject) => {
      try {
        this.session = OT.initSession(apiKey, sessionId);

        this.session.on('sessionConnected', () => {
          this.connectionStatusSubject.next('connected');
          this.publishStream(userName, isHost);

          // Send participant info signal to other participants and request their info
          setTimeout(() => {
            // Get current user state for signaling
            const currentState = this.currentUser || {
              isAudioMuted: this.joinSettings.audioEnabled === false,
              isVideoMuted: this.joinSettings.videoEnabled === false
            };
            
            console.log('Sending initial participant state:', currentState);
            
            this.sendSignal('participantJoined', {
              name: userName,
              isHost: isHost,
              isAudioMuted: currentState.isAudioMuted,
              isVideoMuted: currentState.isVideoMuted,
              connectionId: this.session?.connection?.connectionId
            });
            
            // Request info from all existing participants
            this.sendSignal('requestParticipantInfo', {
              requestingParticipant: userName,
              connectionId: this.session?.connection?.connectionId
            });
          }, 500);

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
          console.log('Stream created:', event.stream);
          console.log('Stream has audio:', event.stream.hasAudio);
          console.log('Stream has video:', event.stream.hasVideo);
          this.subscribeToStream(event.stream, isHost);
        });

        this.session.on('streamDestroyed', (event) => {
          console.log('Stream destroyed:', event.stream);
          this.removeParticipant(event.stream.connection.connectionId);
        });

        this.session.on('streamPropertyChanged', (event) => {
          console.log('Stream property changed:', event);
          if (event.changedProperty === 'hasVideo') {
            console.log(`Video property changed for ${event.stream.connection.connectionId}: hasVideo = ${event.stream.hasVideo}`);
            // Update participant video mute state based on stream property
            this.updateParticipant(event.stream.connection.connectionId, { 
              isVideoMuted: !event.stream.hasVideo 
            });
          }
          if (event.changedProperty === 'hasAudio') {
            console.log(`Audio property changed for ${event.stream.connection.connectionId}: hasAudio = ${event.stream.hasAudio}`);
            // Update participant audio mute state based on stream property
            this.updateParticipant(event.stream.connection.connectionId, { 
              isAudioMuted: !event.stream.hasAudio 
            });
          }
        });

        this.session.on('connectionCreated', (event) => {
          this.addParticipant(event.connection, false); // Default to non-host, will be updated by signal
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

  private publishStream(userName: string, isHost: boolean): void {
    const publisherContainer = document.getElementById('publisher');

    if (!publisherContainer) {
      console.error('Publisher container not found');
      return;
    }


    // Use join settings to determine initial audio/video state
    const publishAudio = this.joinSettings.audioEnabled !== false;
    const publishVideo = this.joinSettings.videoEnabled !== false;

    console.log('Publisher settings:', { 
      userName, 
      isHost, 
      publishAudio, 
      publishVideo,
      joinSettings: this.joinSettings 
    });

    this.publisher = OT.initPublisher(publisherContainer, {
      name: userName,
      width: '100%',
      height: '100%',
      insertMode: 'append',
      showControls: false,
      publishAudio: publishAudio,
      publishVideo: publishVideo,
      audioSource: undefined, // Let OpenTok choose the best audio source
      videoSource: undefined  // Let OpenTok choose the best video source
    });

    if (this.session && this.publisher) {
      // Add publisher event listeners for debugging audio issues
      this.publisher.on('streamCreated', (event) => {
        console.log('Publisher stream created:', event.stream);
        console.log('Audio tracks:', event.stream.hasAudio);
        console.log('Video tracks:', event.stream.hasVideo);
      });

      this.publisher.on('streamDestroyed', (event) => {
        console.log('Publisher stream destroyed:', event.stream);
      });

      this.publisher.on('accessAllowed', () => {
        console.log('Publisher access allowed (microphone/camera permissions granted)');
      });

      this.publisher.on('accessDenied', (error) => {
        console.error('Publisher access denied:', error);
        this.errorSubject.next('Microphone or camera access denied. Please allow permissions and refresh.');
      });

      this.session.publish(this.publisher);
      console.log('Publisher published to session');

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

      console.log('Current user created:', {
        name: userName,
        isAudioMuted: initialAudioMuted,
        isVideoMuted: initialVideoMuted,
        joinSettings: this.joinSettings
      });

      this.participants.push(this.currentUser);
      this.participantsSubject.next([...this.participants]);
      
      // Ensure video overlay state is immediately updated
      setTimeout(() => {
        console.log('Final currentUser state:', this.currentUser);
        this.participantsSubject.next([...this.participants]);
      }, 100);
    }
  }

  private subscribeToStream(stream: OT.Stream, _isHost: boolean): void {
    const subscriberContainer = document.getElementById(`subscriber-${stream.connection.connectionId}`);

    if (!subscriberContainer) {
      console.error(`Subscriber container not found for ${stream.connection.connectionId}`);
      return;
    }

    const subscriber = this.session?.subscribe(stream, subscriberContainer, {
      width: '100%',
      height: '100%',
      insertMode: 'append',
      showControls: false,
      subscribeToAudio: true, // Ensure audio is subscribed
      subscribeToVideo: true  // Ensure video is subscribed
    });

    if (subscriber) {
      // Add subscriber event listeners for debugging audio issues
      subscriber.on('audioLevelUpdated', (event) => {
        console.log(`Audio level for ${stream.connection.connectionId}:`, event.audioLevel);
      });

      subscriber.on('audioBlocked', (event) => {
        console.warn(`Audio blocked for ${stream.connection.connectionId}:`, event);
      });

      subscriber.on('audioUnblocked', (event) => {
        console.log(`Audio unblocked for ${stream.connection.connectionId}:`, event);
      });

      subscriber.on('subscribeToAudio', (event) => {
        console.log(`Subscribed to audio for ${stream.connection.connectionId}:`, event);
      });

      subscriber.on('unsubscribeFromAudio', (event) => {
        console.log(`Unsubscribed from audio for ${stream.connection.connectionId}:`, event);
      });

      this.subscribers.set(stream.connection.connectionId, subscriber);
      
      // Check if participant already exists before adding
      const existingParticipant = this.participants.find(p => p.connectionId === stream.connection.connectionId);
      if (!existingParticipant) {
        this.addParticipant(stream.connection, false); // Default to non-host, will be updated by signal
      }
    }
  }

  private addParticipant(connection: OT.Connection, isHost: boolean): void {
    console.log('Adding participant:', connection);
    const existingParticipant = this.participants.find(p => p.connectionId === connection.connectionId);
    if (!existingParticipant) {
      // Parse connection data to get participant name and initial states
      let participantName = 'Unknown';
      let initialAudioMuted = false;
      let initialVideoMuted = false;
      let participantIsHost = isHost;
      
      if (connection.data) {
        try {
          const connectionData = JSON.parse(connection.data);
          participantName = connectionData.name || connectionData.userName || connectionData.participantName || 'Unknown';
          participantIsHost = connectionData.isHost || connectionData.role === 'host' || isHost;
          // Get initial mute states from connection data if available
          initialAudioMuted = connectionData.isAudioMuted || false;
          initialVideoMuted = connectionData.isVideoMuted || false;
        } catch (error) {
          // If parsing fails, use connection.data as plain text
          participantName = connection.data || 'Unknown';
        }
      }

      const participant: Participant = {
        id: connection.connectionId,
        name: participantName,
        isHost: participantIsHost,
        isAudioMuted: initialAudioMuted,
        isVideoMuted: initialVideoMuted,
        isScreenSharing: false,
        hasRaisedHand: false,
        connectionId: connection.connectionId
      };

      this.participants.push(participant);
      this.participantsSubject.next([...this.participants]);
      console.log('Added participant with initial states:', participant);
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
        console.log(`Received video mute signal from ${event.from?.connectionId}:`, data.muted);
        this.updateParticipant(event.from?.connectionId || '', { isVideoMuted: data.muted });
        
        // Also update the video element visibility immediately
        setTimeout(() => {
          const subscriberElement = document.getElementById(`subscriber-${event.from?.connectionId}`);
          if (subscriberElement) {
            subscriberElement.style.display = data.muted ? 'none' : 'block';
            console.log(`Updated subscriber element visibility for ${event.from?.connectionId}: ${data.muted ? 'hidden' : 'visible'}`);
          }
        }, 50);
        break;
      case 'signal:screenShare':
        this.updateParticipant(event.from?.connectionId || '', { isScreenSharing: data.sharing });
        break;
      case 'signal:chat':
        // Handle incoming chat messages
        this.handleChatMessage(data, event.from?.connectionId);
        break;
      // case 'signal:hostLeft':
      //   // Host has left, end meeting for all participants
      //   this.endMeetingForAll();
      //   break;
      case 'signal:hostDisconnected':
         // Host has left, end meeting for all participants         
        this.endMeetingForAll();
        break;
      case 'signal:participantJoined':
        // Update participant info when someone joins
        this.updateParticipantInfo(event.from?.connectionId || '', data);
        break;
      case 'signal:requestParticipantInfo':
        // Send our info to the requesting participant
        if (this.currentUser && this.session) {
          this.sendSignal('participantInfoResponse', {
            name: this.currentUser.name,
            isHost: this.currentUser.isHost,
            isAudioMuted: this.currentUser.isAudioMuted,
            isVideoMuted: this.currentUser.isVideoMuted,
            connectionId: this.currentUser.connectionId
          });
        }
        break;
      case 'signal:participantInfoResponse':
        // Update participant info from response
        this.updateParticipantInfo(event.from?.connectionId || '', data);
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

  private updateParticipantInfo(connectionId: string, data: any): void {
    const participantIndex = this.participants.findIndex(p => p.connectionId === connectionId);
    if (participantIndex !== -1) {
      // Update participant with the correct name and host status
      const updatedParticipant = {
        ...this.participants[participantIndex],
        name: data.name || this.participants[participantIndex].name,
        isHost: data.isHost !== undefined ? data.isHost : this.participants[participantIndex].isHost,
        // Update mute states if explicitly provided
        isAudioMuted: data.isAudioMuted !== undefined ? data.isAudioMuted : this.participants[participantIndex].isAudioMuted,
        isVideoMuted: data.isVideoMuted !== undefined ? data.isVideoMuted : this.participants[participantIndex].isVideoMuted
      };
      
      this.participants[participantIndex] = updatedParticipant;
      this.participantsSubject.next([...this.participants]);
      console.log('Updated participant info:', updatedParticipant);
      
      // Debug log to track video state changes
      if (data.isVideoMuted !== undefined) {
        console.log(`Participant ${data.name} video muted state changed to:`, data.isVideoMuted);
      }
    } else {
      // If participant doesn't exist, create them with proper initial state
      const participant: Participant = {
        id: connectionId,
        name: data.name || 'Unknown',
        isHost: data.isHost || false,
        isAudioMuted: data.isAudioMuted !== undefined ? data.isAudioMuted : false,
        isVideoMuted: data.isVideoMuted !== undefined ? data.isVideoMuted : false, // Use provided state or default to not muted
        isScreenSharing: false,
        hasRaisedHand: false,
        connectionId: connectionId
      };
      this.participants.push(participant);
      this.participantsSubject.next([...this.participants]);
      console.log('Created new participant from signal:', participant);
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
    // this.sendSignal('hostLeft', { message: 'Host has left the meeting. Meeting ended.' });    
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
      const wasVideoMuted = this.currentUser.isVideoMuted;
      const willEnableVideo = wasVideoMuted; // If currently muted, will enable
      
      // Toggle the OpenTok publisher video
      this.publisher.publishVideo(willEnableVideo);
      
      // Update local state
      this.currentUser.isVideoMuted = !wasVideoMuted;
      
      // Send signal to other participants
      this.sendSignal('muteVideo', { muted: this.currentUser.isVideoMuted });
      
      console.log('Video toggled:', { 
        wasVideoMuted: wasVideoMuted, 
        nowVideoMuted: this.currentUser.isVideoMuted,
        publisherVideoEnabled: willEnableVideo,
        signalSent: { muted: this.currentUser.isVideoMuted }
      });
      
      // Update local video element visibility
      const publisherElement = document.getElementById('publisher');
      if (publisherElement) {
        publisherElement.style.display = this.currentUser.isVideoMuted ? 'none' : 'block';
      }
      
      // Force participants update to ensure overlay visibility changes
      this.participantsSubject.next([...this.participants]);
      
      // Additional delayed update to ensure UI changes are reflected
      setTimeout(() => {
        console.log('Video toggle follow-up - currentUser state:', this.currentUser);
        this.participantsSubject.next([...this.participants]);
      }, 100);
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
    
    // Only call performLocalCleanup if meetingService exists
    if (this.meetingService && typeof this.meetingService.performLocalCleanup === 'function') {
      this.meetingService.performLocalCleanup();
    }
  }

  getCurrentUser(): Participant | null {
    return this.currentUser;
  }

}