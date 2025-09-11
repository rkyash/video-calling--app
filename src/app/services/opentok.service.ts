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
  private meetingRoomComponent: any = null;
  private joinSettings: { audioEnabled?: boolean, videoEnabled?: boolean } = {};

  constructor() { }

  // Method to set meeting service to avoid circular dependency
  setMeetingService(meetingService: any): void {
    this.meetingService = meetingService;
  }

  // Method to set meeting room component reference
  setMeetingRoomComponent(component: any): void {
    this.meetingRoomComponent = component;
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
          console.log('Stream videoType:', event.stream.videoType);
          console.log('Stream name:', event.stream.name);
          
          // Handle screen share streams differently
          if (event.stream.videoType === 'screen') {
            console.log('Screen share stream detected');
            this.handleScreenShareStream(event.stream);
          } else {
            this.subscribeToStream(event.stream, isHost);
          }
        });

        this.session.on('streamDestroyed', (event) => {
          console.log('Stream destroyed:', event.stream);
          console.log('Stream videoType:', event.stream.videoType);
          console.log('Stream name:', event.stream.name);
          
          // Don't remove participant if this is just a screen share stream being destroyed
          if (event.stream.videoType === 'screen') {
            console.log('Screen share stream destroyed - not removing participant');
            // Only update the screen sharing state for the participant
            this.updateParticipant(event.stream.connection.connectionId, { isScreenSharing: false });
            
            // Clean up screen share subscriber if it exists
            const screenSubscriber = this.subscribers.get(`screen-${event.stream.connection.connectionId}`);
            if (screenSubscriber) {
              this.subscribers.delete(`screen-${event.stream.connection.connectionId}`);
              console.log('Screen share subscriber cleaned up');
            }
          } else {
            // This is a regular video/audio stream being destroyed - participant is leaving
            console.log('Regular stream destroyed - removing participant');
            this.removeParticipant(event.stream.connection.connectionId);
          }
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

  private handleScreenShareStream(stream: OT.Stream): void {
    console.log('Handling screen share stream from:', stream.connection.connectionId);
    
    // Find the screen share container - it should already exist due to the screen share layout
    let screenShareContainer = document.getElementById('screen-share-publisher');
    
    // If this is a remote screen share, we need to create a subscriber in the screen share area
    if (stream.connection.connectionId !== this.currentUser?.connectionId) {
      console.log('Remote screen share detected, subscribing...');
      
      // Update participant state to show they are screen sharing
      this.updateParticipant(stream.connection.connectionId, { isScreenSharing: true });
      
      // Create subscriber for remote screen share
      if (screenShareContainer) {
        const subscriber = this.session?.subscribe(stream, screenShareContainer, {
          width: '100%',
          height: '100%',
          insertMode: 'append',
          showControls: false,
          subscribeToAudio: false, // Don't subscribe to audio from screen share
          subscribeToVideo: true
        });
        
        if (subscriber) {
          this.subscribers.set(`screen-${stream.connection.connectionId}`, subscriber);
          console.log('Remote screen share subscriber created');
          
          // Force visibility
          setTimeout(() => {
            this.forceScreenShareVisibility();
          }, 200);
        }
      }
    }
  }

  private subscribeToStream(stream: OT.Stream, _isHost: boolean): void {
    console.log(`Attempting to subscribe to stream for connection: ${stream.connection.connectionId}`);
    console.log(`Stream has video: ${stream.hasVideo}, Stream has audio: ${stream.hasAudio}`);
    console.log(`Stream videoType: ${stream.videoType}, Stream name: ${stream.name}`);
    
    const subscriberContainer = document.getElementById(`subscriber-${stream.connection.connectionId}`);

    if (!subscriberContainer) {
      console.error(`Subscriber container not found for ${stream.connection.connectionId}`);
      console.log('Available DOM elements with subscriber- prefix:', 
        Array.from(document.querySelectorAll('[id*="subscriber-"]')).map(el => el.id));
      
      // Multiple retry attempts with longer delays
      let retryCount = 0;
      const maxRetries = 5;
      
      const retrySubscription = () => {
        retryCount++;
        console.log(`Retry attempt ${retryCount}/${maxRetries} for ${stream.connection.connectionId}`);
        
        const retryContainer = document.getElementById(`subscriber-${stream.connection.connectionId}`);
        if (retryContainer) {
          console.log(`Retry ${retryCount}: Found subscriber container, attempting to subscribe`);
          this.subscribeToStreamWithContainer(stream, retryContainer);
        } else if (retryCount < maxRetries) {
          console.log(`Retry ${retryCount}: Still no container, trying again in ${retryCount * 500}ms`);
          setTimeout(retrySubscription, retryCount * 500);
        } else {
          console.error(`Failed to find subscriber container after ${maxRetries} retries for ${stream.connection.connectionId}`);
        }
      };
      
      setTimeout(retrySubscription, 500);
      return;
    }

    this.subscribeToStreamWithContainer(stream, subscriberContainer);
  }

  private subscribeToStreamWithContainer(stream: OT.Stream, container: HTMLElement): void {
    console.log(`Creating subscriber for ${stream.connection.connectionId} in container:`, container.id);
    console.log(`Container dimensions: ${container.offsetWidth}x${container.offsetHeight}`);
    
    const subscriber = this.session?.subscribe(stream, container, {
      width: '100%',
      height: '100%',
      insertMode: 'append',
      showControls: false,
      subscribeToAudio: true, // Ensure audio is subscribed
      subscribeToVideo: true  // Ensure video is subscribed
    });

    if (subscriber) {
      console.log(`Subscriber created successfully for ${stream.connection.connectionId}`);
      
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

      // Add video-specific event handlers for debugging
      subscriber.on('subscribeToVideo', (event) => {
        console.log(`Subscribed to video for ${stream.connection.connectionId}:`, event);
        console.log(`Video element created:`, subscriber.element);
        
        // Debug the video element visibility
        setTimeout(() => {
          const videoElement = subscriber.element?.querySelector('video');
          if (videoElement) {
            console.log(`Video element for ${stream.connection.connectionId}:`, {
              display: videoElement.style.display,
              visibility: videoElement.style.visibility,
              width: videoElement.offsetWidth,
              height: videoElement.offsetHeight,
              videoWidth: videoElement.videoWidth,
              videoHeight: videoElement.videoHeight
            });
          }
        }, 100);
      });

      subscriber.on('unsubscribeFromVideo', (event) => {
        console.log(`Unsubscribed from video for ${stream.connection.connectionId}:`, event);
      });

      subscriber.on('videoEnabled', (event) => {
        console.log(`Video enabled for ${stream.connection.connectionId}:`, event);
        // Update participant state when video is enabled
        this.updateParticipant(stream.connection.connectionId, { isVideoMuted: false });
        
        // Debug DOM state after video enabled
        setTimeout(() => {
          const videoContainer = document.getElementById(`subscriber-${stream.connection.connectionId}`);
          if (videoContainer) {
            const videoElement = videoContainer.querySelector('video');
            console.log(`Video container DOM state for ${stream.connection.connectionId}:`, {
              display: videoContainer.style.display,
              computedDisplay: window.getComputedStyle(videoContainer).display,
              visibility: videoContainer.style.visibility,
              computedVisibility: window.getComputedStyle(videoContainer).visibility,
              offsetWidth: videoContainer.offsetWidth,
              offsetHeight: videoContainer.offsetHeight,
              hasVideoElement: !!videoElement,
              innerHTML: videoContainer.innerHTML.length > 0,
              containerChildren: videoContainer.children.length,
              videoElementState: videoElement ? {
                videoWidth: videoElement.videoWidth,
                videoHeight: videoElement.videoHeight,
                readyState: videoElement.readyState,
                srcObject: !!videoElement.srcObject,
                currentTime: videoElement.currentTime,
                paused: videoElement.paused,
                muted: videoElement.muted,
                style: {
                  display: videoElement.style.display,
                  visibility: videoElement.style.visibility,
                  width: videoElement.style.width,
                  height: videoElement.style.height
                }
              } : null
            });
            
            // Debug the subscriber object state
            const subscriberObj = this.subscribers.get(stream.connection.connectionId);
            if (subscriberObj) {
              console.log(`Subscriber object state for ${stream.connection.connectionId}:`, {
                subscriberExists: true,
                element: !!subscriberObj.element,
                stream: !!subscriberObj.stream,
                streamHasVideo: subscriberObj.stream?.hasVideo,
                streamVideoType: subscriberObj.stream?.videoType,
                subscriberVideoEnabled: !subscriberObj.restrictFrameRate,
                id: subscriberObj.id
              });
            } else {
              console.error(`Subscriber object not found for ${stream.connection.connectionId}`);
            }
            
            // Force container visibility when video is enabled
            console.log(`Ensuring video container visibility for ${stream.connection.connectionId}`);
            videoContainer.style.display = 'block';
            videoContainer.style.visibility = 'visible';
            
            // Fix: Ensure the subscriber element is properly attached to the container
            if (subscriberObj && subscriberObj.element) {
              console.log(`Fixing subscriber element attachment for ${stream.connection.connectionId}`);
              
              // Clear the container first
              videoContainer.innerHTML = '';
              
              // Re-attach the subscriber element
              videoContainer.appendChild(subscriberObj.element);
              
              console.log(`Subscriber element re-attached. Container children: ${videoContainer.children.length}`);
              
              // Verify video element is now present
              setTimeout(() => {
                const videoElement = videoContainer.querySelector('video');
                console.log(`Video element verification for ${stream.connection.connectionId}:`, {
                  hasVideoElement: !!videoElement,
                  containerChildren: videoContainer.children.length,
                  videoElementSrc: videoElement ? !!videoElement.srcObject : null
                });
              }, 100);
            }
          } else {
            console.error(`Video container not found in DOM for ${stream.connection.connectionId}`);
          }
        }, 100);
      });

      subscriber.on('videoDisabled', (event) => {
        console.log(`Video disabled for ${stream.connection.connectionId}:`, event);
        // Update participant state when video is disabled
        this.updateParticipant(stream.connection.connectionId, { isVideoMuted: true });
      });

      subscriber.on('connected', (event) => {
        console.log(`Subscriber connected for ${stream.connection.connectionId}:`, event);
        console.log(`Initial stream state - hasVideo: ${stream.hasVideo}, hasAudio: ${stream.hasAudio}`);
        
        // Set initial video state based on stream properties
        this.updateParticipant(stream.connection.connectionId, { 
          isVideoMuted: !stream.hasVideo,
          isAudioMuted: !stream.hasAudio
        });
        
        // Verify the video element was created properly
        setTimeout(() => {
          const videoElement = subscriber.element?.querySelector('video');
          console.log(`Subscriber video element check for ${stream.connection.connectionId}:`, {
            element: !!videoElement,
            hasVideoTracks: !!videoElement?.videoWidth,
            dimensions: videoElement ? `${videoElement.videoWidth}x${videoElement.videoHeight}` : 'none'
          });
        }, 200);
      });

      this.subscribers.set(stream.connection.connectionId, subscriber);
      
      // Ensure the subscriber element is properly attached to the container
      setTimeout(() => {
        if (subscriber.element && container) {
          console.log(`Ensuring subscriber element is attached for ${stream.connection.connectionId}`);
          
          // Check if the element is already in the container
          if (!container.contains(subscriber.element)) {
            console.log(`Subscriber element not in container, re-attaching for ${stream.connection.connectionId}`);
            container.innerHTML = ''; // Clear any existing content
            container.appendChild(subscriber.element);
          }
          
          // Verify attachment
          const videoElement = container.querySelector('video');
          console.log(`Initial subscriber attachment verification for ${stream.connection.connectionId}:`, {
            elementAttached: container.contains(subscriber.element),
            hasVideoElement: !!videoElement,
            containerChildren: container.children.length
          });
        }
      }, 200);
      
      // Check if participant already exists before adding
      const existingParticipant = this.participants.find(p => p.connectionId === stream.connection.connectionId);
      if (!existingParticipant) {
        this.addParticipant(stream.connection, false); // Default to non-host, will be updated by signal
      }
      
      console.log(`Subscriber stored in map for ${stream.connection.connectionId}`);
    } else {
      console.error(`Failed to create subscriber for ${stream.connection.connectionId}`);
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
          participantName = connectionData?.name || connectionData?.userName || connectionData?.participantName || 'Unknown';
          participantIsHost = connectionData?.isHost || connectionData?.role === 'host' || isHost;
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
    
    console.log('Removing participant:', {
      connectionId,
      participantName: leavingParticipant?.name,
      isHost: leavingParticipant?.isHost
    });
    
    this.participants = this.participants.filter(p => p.connectionId !== connectionId);

    // If host is leaving, disconnect all participants and end the meeting
    // if (leavingParticipant?.isHost) {
    //   console.log('Host is leaving - ending meeting for all participants');
    //   this.endMeetingForAll();
    //   return;
    // }

    this.participantsSubject.next([...this.participants]);

    // Clean up regular video subscriber
    const subscriber = this.subscribers.get(connectionId);
    if (subscriber) {
      this.subscribers.delete(connectionId);
      console.log('Regular subscriber cleaned up for:', connectionId);
    }
    
    // Clean up screen share subscriber if it exists
    const screenSubscriber = this.subscribers.get(`screen-${connectionId}`);
    if (screenSubscriber) {
      this.subscribers.delete(`screen-${connectionId}`);
      console.log('Screen share subscriber cleaned up for:', connectionId);
    }
  }

  private handleSignal(event: any): void {
     const data = this.safeJsonParse(event.data);

    switch (event.type) {
      case 'signal:raiseHand':
        this.updateParticipant(event.from?.connectionId || '', { hasRaisedHand: data.raised });
        break;
      case 'signal:muteAudio':
        this.updateParticipant(event.from?.connectionId || '', { isAudioMuted: data.muted });
        break;
      case 'signal:muteVideo':
        console.log(`Received video mute signal from ${event.from?.connectionId}:`, {
          fromConnectionId: event.from?.connectionId,
          muted: data.muted,
          signalData: data
        });
        this.updateParticipant(event.from?.connectionId || '', { isVideoMuted: data.muted });
        
        // Additional debug: log the participant state after update
        setTimeout(() => {
          const updatedParticipant = this.participants.find(p => p.connectionId === event.from?.connectionId);
          console.log(`Updated participant state after video signal:`, {
            connectionId: event.from?.connectionId,
            participant: updatedParticipant,
            isVideoMuted: updatedParticipant?.isVideoMuted
          });
        }, 50);
        break;
      case 'signal:screenShare':
        console.log(`Received screen share signal from ${event.from?.connectionId}:`, data.sharing);
        this.updateParticipant(event.from?.connectionId || '', { isScreenSharing: data.sharing });
        
        // If screen sharing started, ensure the layout is updated and visible
        if (data.sharing) {
          console.log('Screen sharing started by participant:', event.from?.connectionId);
          setTimeout(() => {
            this.forceScreenShareVisibility();
          }, 300);
        }
        break;
      case 'signal:recordingStatus':
        console.log(`Received recording status signal from ${event.from?.connectionId}:`, data);
        // Update recording state for all participants
        if (this.meetingRoomComponent && this.meetingRoomComponent.handleRecordingStatusSignal) {
          this.meetingRoomComponent.handleRecordingStatusSignal(data.isRecording, data.message, data.recordingStartTime);
        }
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
         if(!this.currentUser?.isHost)
            this.endMeetingForAll();          
        break;
      case 'signal:participantJoined':
        // Update participant info when someone joins
        this.updateParticipantInfo(event.from?.connectionId || '', data);
        break;
      case 'signal:requestParticipantInfo':
        // Send our info to the requesting participant
        if (this.currentUser && this.session) {
          const responseData: any = {
            name: this.currentUser.name,
            isHost: this.currentUser.isHost,
            isAudioMuted: this.currentUser.isAudioMuted,
            isVideoMuted: this.currentUser.isVideoMuted,
            connectionId: this.currentUser.connectionId
          };
          
          // If this is the host and recording is active, include recording status
          if (this.currentUser.isHost && this.meetingRoomComponent) {
            responseData.isRecording = this.meetingRoomComponent.isRecording;
            responseData.recordingStartTime = this.meetingRoomComponent.recordingStartTime?.toISOString() || null;
          }
          
          this.sendSignal('participantInfoResponse', responseData);
        }
        break;
      case 'signal:participantInfoResponse':
        // Update participant info from response
        this.updateParticipantInfo(event.from?.connectionId || '', data);
        
        // If response is from host and includes recording status, update recording state for late-joining participant
        if (data.isHost && data.isRecording !== undefined && this.meetingRoomComponent) {
          console.log('Received recording status from host for late-joining participant:', {
            isRecording: data.isRecording,
            recordingStartTime: data.recordingStartTime
          });
          if(this.currentUser?.isHost === false)
            this.meetingRoomComponent.handleRecordingStatusSignal(data.isRecording, 'Recording in progress', data.recordingStartTime);
        }
        break;
    }
  }

  private safeJsonParse(data: any): any {
  try {
    return typeof data === 'string' ? JSON.parse(data) : data;
  } catch (error) {
    console.warn('Received non-JSON signal data:', data);
    return {};  // Fallback to empty object
  }
}

  private updateParticipant(connectionId: string, updates: Partial<Participant>): void {
    const participantIndex = this.participants.findIndex(p => p.connectionId === connectionId);
    if (participantIndex !== -1) {
      const oldParticipant = { ...this.participants[participantIndex] };
      this.participants[participantIndex] = { ...this.participants[participantIndex], ...updates };
      
      // Enhanced debug logging for video state changes
      if (updates.isVideoMuted !== undefined) {
        console.log(`Video state update for participant:`, {
          connectionId,
          participantName: this.participants[participantIndex].name,
          oldVideoMuted: oldParticipant.isVideoMuted,
          newVideoMuted: updates.isVideoMuted,
          finalVideoMuted: this.participants[participantIndex].isVideoMuted
        });
      }
      
      // Force state propagation with new array reference
      const updatedParticipants = [...this.participants];
      this.participantsSubject.next(updatedParticipants);
      
      console.log(`Participant updated - total participants:`, updatedParticipants.length);
    } else {
      console.warn(`Attempted to update non-existent participant:`, {
        connectionId,
        updates,
        existingParticipants: this.participants.map(p => ({ id: p.connectionId, name: p.name }))
      });
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
      
      console.log('Video toggle starting:', { 
        wasVideoMuted: wasVideoMuted, 
        willEnableVideo: willEnableVideo,
        currentUser: this.currentUser.name,
        publisherExists: !!this.publisher,
        publisherElement: !!this.publisher.element
      });
      
      // Debug publisher element state before toggle
      const publisherContainer = document.getElementById('publisher');
      console.log('Publisher container before toggle:', {
        containerExists: !!publisherContainer,
        containerChildren: publisherContainer?.children.length || 0,
        containerDisplay: publisherContainer ? window.getComputedStyle(publisherContainer).display : 'N/A',
        publisherElementAttached: publisherContainer && this.publisher.element ? publisherContainer.contains(this.publisher.element) : false
      });
      
      // Toggle the OpenTok publisher video
      this.publisher.publishVideo(willEnableVideo);
      
      // Update local state immediately
      this.currentUser.isVideoMuted = !wasVideoMuted;
      
      // Send signal to other participants
      this.sendSignal('muteVideo', { muted: this.currentUser.isVideoMuted });
      
      console.log('Video toggled:', { 
        wasVideoMuted: wasVideoMuted, 
        nowVideoMuted: this.currentUser.isVideoMuted,
        publisherVideoEnabled: willEnableVideo,
        signalSent: { muted: this.currentUser.isVideoMuted }
      });
      
      // Force participants update to trigger Angular template updates
      this.participantsSubject.next([...this.participants]);
      
      // Additional delayed update to ensure state synchronization and fix publisher attachment
      setTimeout(() => {
        console.log('Video toggle delayed update - currentUser state:', this.currentUser);
        
        // Check publisher element attachment after toggle
        const publisherContainerAfter = document.getElementById('publisher');
        if (publisherContainerAfter && this.publisher?.element) {
          const isAttached = publisherContainerAfter.contains(this.publisher.element);
          console.log('Publisher element attachment check after toggle:', {
            containerExists: !!publisherContainerAfter,
            publisherElementExists: !!this.publisher.element,
            isAttached: isAttached,
            containerChildren: publisherContainerAfter.children.length
          });
          
          // Fix publisher attachment if needed (similar to subscriber fix)
          if (!isAttached) {
            console.log('Publisher element not attached, re-attaching...');
            publisherContainerAfter.innerHTML = '';
            publisherContainerAfter.appendChild(this.publisher.element);
            console.log('Publisher element re-attached successfully');
          }
        }
        
        this.participantsSubject.next([...this.participants]);
      }, 100);
    } else {
      console.error('Cannot toggle video - publisher or currentUser not available:', {
        publisherExists: !!this.publisher,
        currentUserExists: !!this.currentUser
      });
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

      console.log('Starting screen publisher with container:', screenShareContainer);

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
        // Add event listeners before publishing
        this.screenPublisher.on('streamCreated', (event) => {
          console.log('Screen share stream created:', event.stream);
          // Ensure all participants can see the screen share
          this.forceScreenShareVisibility();
        });

        this.screenPublisher.on('accessAllowed', () => {
          console.log('Screen share access allowed');
        });

        this.screenPublisher.on('accessDenied', (error) => {
          console.error('Screen share access denied:', error);
          this.stopScreenSharing();
        });

        // Listen for screen share ended (when user stops sharing via browser UI)
        this.screenPublisher.on('streamDestroyed', () => {
          console.log('Screen share stream destroyed');
          this.stopScreenSharing();
        });

        this.session.publish(this.screenPublisher);
        console.log('Screen publisher published to session');

        // Update the signal with the actual stream ID now that it's available
        if (this.currentUser) {
          setTimeout(() => {
            this.sendSignal('screenShare', {
              sharing: true,
              streamId: this.screenPublisher?.stream?.streamId || 'screen-share'
            });
            console.log('Screen share signal sent with stream ID');
          }, 500);
        }
      }
    } catch (error) {
      console.error('Screen sharing failed:', error);
      // Reset screen sharing state on error
      if (this.currentUser) {
        this.currentUser.isScreenSharing = false;
        this.sendSignal('screenShare', { sharing: false });
        this.participantsSubject.next([...this.participants]);
      }
      this.errorSubject.next('Failed to start screen sharing. Please allow screen sharing permission.');
      throw error;
    }
  }

  stopScreenSharing(): void {
    console.log('Stopping screen sharing...');
    
    // Debug publisher state before stopping screen share
    const publisherContainer = document.getElementById('publisher');
    console.log('Publisher state before stopping screen share:', {
      publisherExists: !!this.publisher,
      publisherElement: !!this.publisher?.element,
      containerExists: !!publisherContainer,
      containerChildren: publisherContainer?.children.length || 0,
      publisherAttached: publisherContainer && this.publisher?.element ? publisherContainer.contains(this.publisher.element) : false
    });
    
    if (this.screenPublisher && this.currentUser?.isScreenSharing) {
      console.log('Unpublishing screen share stream');
      
      // Remove event listeners to prevent recursive calls
      this.screenPublisher.off('streamDestroyed');
      
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
        console.log('Screen sharing state updated and signal sent');
      }
      
      // Debug and fix publisher attachment after stopping screen share
      setTimeout(() => {
        const publisherContainerAfter = document.getElementById('publisher');
        console.log('Publisher state after stopping screen share:', {
          publisherExists: !!this.publisher,
          publisherElement: !!this.publisher?.element,
          containerExists: !!publisherContainerAfter,
          containerChildren: publisherContainerAfter?.children.length || 0,
          publisherAttached: publisherContainerAfter && this.publisher?.element ? publisherContainerAfter.contains(this.publisher.element) : false
        });
        
        // Ensure publisher element is properly attached after screen share stops
        if (publisherContainerAfter && this.publisher?.element && !publisherContainerAfter.contains(this.publisher.element)) {
          console.log('Publisher element detached after screen share stop, re-attaching...');
          publisherContainerAfter.innerHTML = '';
          publisherContainerAfter.appendChild(this.publisher.element);
          console.log('Publisher element re-attached after screen share stop');
        }
      }, 200);
      
    } else {
      console.log('Screen sharing already stopped or not active');
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

  broadcastRecordingStatus(isRecording: boolean, message: string, recordingStartTime?: Date): void {
    console.log('Broadcasting recording status:', { isRecording, message, recordingStartTime });
    this.sendSignal('recordingStatus', {
      isRecording: isRecording,
      message: message,
      hostName: this.currentUser?.name || 'Host',
      timestamp: new Date().toISOString(),
      recordingStartTime: recordingStartTime?.toISOString() || null
    });
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

  private forceScreenShareVisibility(): void {
    // Ensure screen share is visible to all participants
    setTimeout(() => {
      const screenShareElement = document.getElementById('screen-share-publisher');
      if (screenShareElement) {
        // Make sure the screen share element is properly visible
        screenShareElement.style.display = 'block';
        screenShareElement.style.visibility = 'visible';
        console.log('Screen share element visibility forced');
        
        // Also ensure the parent container is visible
        const screenShareContainer = screenShareElement.closest('.screen-share-container');
        if (screenShareContainer) {
          (screenShareContainer as HTMLElement).style.display = 'block';
          (screenShareContainer as HTMLElement).style.visibility = 'visible';
        }
      }
      
      // Force layout update
      this.participantsSubject.next([...this.participants]);
    }, 100);
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