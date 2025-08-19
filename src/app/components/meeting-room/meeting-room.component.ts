import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { OpenTokService } from '../../services/opentok.service';
import { MeetingService } from '../../services/meeting.service';
import { ScreenshotService } from '../../services/screenshot.service';
import { Meeting, Participant, ChatMessage } from '../../models/meeting.model';

@Component({
  selector: 'app-meeting-room',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="meeting-room" [class.fullscreen]="isFullscreen">
      <!-- Meeting Header -->
      <header class="meeting-header" [class.hidden]="isFullscreen">
        <div class="meeting-info">
          <h2>{{ currentMeeting?.name || 'Meeting Room' }}</h2>
          <div class="meeting-details">
            <span class="meeting-id">ID: {{ meetingId }}</span>
            <span class="participant-count">
              <i class="fas fa-users"></i> {{ participants.length }}
            </span>
            <span class="recording-indicator" *ngIf="isRecording">
              <i class="fas fa-circle recording-dot"></i> REC
            </span>
          </div>
        </div>

        <div class="meeting-actions">
          <button class="btn btn-outline btn-sm" (click)="copyMeetingLink()">
            <i class="fas fa-link"></i> Copy Link
          </button>
          <button class="btn btn-outline btn-sm" (click)="toggleFullscreen()">
            <i [class]="isFullscreen ? 'fas fa-compress' : 'fas fa-expand'"></i>
          </button>
          <button class="btn btn-secondary btn-sm" (click)="leaveMeeting()">
            <i class="fas fa-sign-out-alt"></i> Leave
          </button>
        </div>
      </header>

      <!-- Main Meeting Content -->
      <div class="meeting-content">
        <!-- Video Grid -->
        <div class="video-section" [class.chat-open]="isChatOpen">
          <div class="video-grid" #videoGrid [ngClass]="getVideoGridClass()">
            <!-- Local Video -->
            <div class="video-participant local-video">
              <div class="video-container">
                <div id="publisher" class="video-element"></div>
                <div class="participant-overlay">
                  <span class="participant-name">{{ currentUser?.name }} (You)</span>
                  <div class="participant-status">
                    <span *ngIf="currentUser?.isAudioMuted" class="status-icon muted">
                      <i class="fas fa-microphone-slash"></i>
                    </span>
                    <span *ngIf="currentUser?.isVideoMuted" class="status-icon muted">
                      <i class="fas fa-video-slash"></i>
                    </span>
                    <span *ngIf="currentUser?.isScreenSharing" class="status-icon sharing">
                      <i class="fas fa-desktop"></i>
                    </span>
                    <span *ngIf="currentUser?.hasRaisedHand" class="status-icon raised-hand">
                      <i class="fas fa-hand-paper"></i>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Remote Videos -->
            <div 
              *ngFor="let participant of remoteParticipants" 
              class="video-participant"
              [attr.data-connection-id]="participant.connectionId"
            >
              <div class="video-container">
                <div [id]="'subscriber-' + participant.connectionId" class="video-element"></div>
                <div class="participant-overlay">
                  <span class="participant-name">{{ participant.name }}</span>
                  <div class="participant-status">
                    <span *ngIf="participant.isHost" class="status-icon host">
                      <i class="fas fa-crown"></i>
                    </span>
                    <span *ngIf="participant.isAudioMuted" class="status-icon muted">
                      <i class="fas fa-microphone-slash"></i>
                    </span>
                    <span *ngIf="participant.isVideoMuted" class="status-icon muted">
                      <i class="fas fa-video-slash"></i>
                    </span>
                    <span *ngIf="participant.isScreenSharing" class="status-icon sharing">
                      <i class="fas fa-desktop"></i>
                    </span>
                    <span *ngIf="participant.hasRaisedHand" class="status-icon raised-hand">
                      <i class="fas fa-hand-paper"></i>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Chat Sidebar -->
        <div class="chat-sidebar" [class.open]="isChatOpen">
          <div class="chat-header">
            <h3><i class="fas fa-comments"></i> Chat</h3>
            <button class="chat-toggle" (click)="toggleChat()">
              <i class="fas fa-times"></i>
            </button>
          </div>

          <div class="chat-messages" #chatMessagesContainer>
            <div 
              *ngFor="let message of chatMessages; trackBy: trackByMessageId" 
              class="chat-message"
              [ngClass]="{ 'system-message': message.type === 'system', 'own-message': message.participantId === currentUser?.id }"
            >
              <div *ngIf="message.type === 'text'" class="message-content">
                <div class="message-header">
                  <span class="sender-name">{{ message.participantName }}</span>
                  <span class="message-time">{{ formatTime(message.timestamp) }}</span>
                </div>
                <div class="message-text">{{ message.message }}</div>
              </div>
              <div *ngIf="message.type === 'system'" class="system-content">
                <i class="fas fa-info-circle"></i>
                {{ message.message }}
              </div>
            </div>
          </div>

          <div class="chat-input">
            <div class="input-group">
              <input
                type="text"
                [(ngModel)]="newMessage"
                (keyup.enter)="sendMessage()"
                placeholder="Type a message..."
                class="message-input"
                [disabled]="!currentUser"
              >
              <button 
                class="send-button"
                (click)="sendMessage()"
                [disabled]="!newMessage.trim() || !currentUser"
              >
                <i class="fas fa-paper-plane"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Meeting Controls -->
      <div class="meeting-controls" [class.hidden]="isFullscreen">
        <div class="control-group">
          <!-- Audio Controls -->
          <button 
            class="control-button"
            [class.muted]="currentUser?.isAudioMuted"
            (click)="toggleAudio()"
            title="Toggle Microphone"
          >
            <i [class]="currentUser?.isAudioMuted ? 'fas fa-microphone-slash' : 'fas fa-microphone'"></i>
          </button>

          <!-- Video Controls -->
          <button 
            class="control-button"
            [class.muted]="currentUser?.isVideoMuted"
            (click)="toggleVideo()"
            title="Toggle Camera"
          >
            <i [class]="currentUser?.isVideoMuted ? 'fas fa-video-slash' : 'fas fa-video'"></i>
          </button>

          <!-- Screen Share -->
          <button 
            class="control-button"
            [class.active]="currentUser?.isScreenSharing"
            (click)="toggleScreenShare()"
            title="Share Screen"
          >
            <i class="fas fa-desktop"></i>
          </button>

          <!-- Screenshot -->
          <button 
            class="control-button"
            (click)="takeScreenshot()"
            title="Take Screenshot"
          >
            <i class="fas fa-camera"></i>
          </button>
        </div>

        <div class="control-group">
          <!-- Raise Hand -->
          <button 
            class="control-button"
            [class.active]="currentUser?.hasRaisedHand"
            (click)="toggleRaiseHand()"
            title="Raise Hand"
          >
            <i class="fas fa-hand-paper"></i>
          </button>

          <!-- Chat -->
          <button 
            class="control-button"
            [class.active]="isChatOpen"
            (click)="toggleChat()"
            title="Toggle Chat"
          >
            <i class="fas fa-comments"></i>
            <span class="notification-badge" *ngIf="unreadMessages > 0">{{ unreadMessages }}</span>
          </button>

          <!-- Participants -->
          <button 
            class="control-button"
            (click)="toggleParticipants()"
            title="Participants"
          >
            <i class="fas fa-users"></i>
            <span class="count-badge">{{ participants.length }}</span>
          </button>

          <!-- Recording -->
          <button 
            class="control-button"
            [class.active]="isRecording"
            (click)="toggleRecording()"
            title="Toggle Recording"
            *ngIf="currentUser?.isHost"
          >
            <i class="fas fa-record-vinyl"></i>
          </button>
        </div>

        <div class="control-group">
          <!-- Settings -->
          <button 
            class="control-button"
            (click)="openSettings()"
            title="Settings"
          >
            <i class="fas fa-cog"></i>
          </button>

          <!-- End Meeting -->
          <button 
            class="control-button end-call"
            (click)="leaveMeeting()"
            title="Leave Meeting"
          >
            <i class="fas fa-phone-slash"></i>
          </button>
        </div>
      </div>

      <!-- Participants Panel -->
      <div class="participants-panel" [class.open]="isParticipantsOpen">
        <div class="panel-header">
          <h3><i class="fas fa-users"></i> Participants ({{ participants.length }})</h3>
          <button class="panel-close" (click)="toggleParticipants()">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="participants-list">
          <div 
            *ngFor="let participant of participants" 
            class="participant-item"
          >
            <div class="participant-info">
              <div class="participant-avatar">
                <i class="fas fa-user"></i>
              </div>
              <div class="participant-details">
                <span class="participant-name">
                  {{ participant.name }}
                  <span *ngIf="participant.id === currentUser?.id" class="you-label">(You)</span>
                </span>
                <div class="participant-badges">
                  <span *ngIf="participant.isHost" class="badge host-badge">
                    <i class="fas fa-crown"></i> Host
                  </span>
                  <span *ngIf="participant.hasRaisedHand" class="badge raised-hand-badge">
                    <i class="fas fa-hand-paper"></i> Hand Raised
                  </span>
                </div>
              </div>
            </div>
            <div class="participant-actions" *ngIf="currentUser?.isHost && participant.id !== currentUser?.id">
              <button 
                class="action-button"
                (click)="muteParticipant(participant)"
                title="Mute Participant"
              >
                <i class="fas fa-microphone-slash"></i>
              </button>
              <button 
                class="action-button remove"
                (click)="removeParticipant(participant)"
                title="Remove Participant"
              >
                <i class="fas fa-user-times"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading Overlay -->
    <div class="loading-overlay" *ngIf="isConnecting">
      <div class="loading-content">
        <div class="spinner large"></div>
        <h3>Connecting to meeting...</h3>
        <p>Please wait while we set up your video call.</p>
      </div>
    </div>

    <!-- Error Overlay -->
    <div class="error-overlay" *ngIf="connectionError">
      <div class="error-content">
        <i class="fas fa-exclamation-triangle"></i>
        <h3>Connection Error</h3>
        <p>{{ connectionError }}</p>
        <button class="btn btn-primary" (click)="retryConnection()">
          <i class="fas fa-redo"></i> Retry
        </button>
      </div>
    </div>
  `,
  styles: [`
    .meeting-room {
      height: 100vh;
      display: flex;
      flex-direction: column;
      background: var(--dark-bg);
      overflow: hidden;

      &.fullscreen {
        .meeting-content {
          height: 100vh;
        }

        .video-section {
          border-radius: 0;
        }
      }
    }

    .meeting-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 2rem;
      background: var(--dark-surface);
      border-bottom: 1px solid var(--dark-card);

      .meeting-info {
        h2 {
          font-size: 1.25rem;
          font-weight: 600;
          color: var(--text-light);
          margin-bottom: 0.25rem;
        }

        .meeting-details {
          display: flex;
          gap: 1rem;
          font-size: 0.875rem;
          color: var(--text-secondary);

          .meeting-id {
            font-family: 'Monaco', 'Courier New', monospace;
            color: var(--primary-color);
          }

          .participant-count i {
            margin-right: 0.25rem;
          }

          .recording-indicator {
            color: var(--secondary-color);
            font-weight: 600;

            .recording-dot {
              animation: pulse 2s infinite;
            }
          }
        }
      }

      .meeting-actions {
        display: flex;
        gap: 0.5rem;
      }
    }

    .meeting-content {
      flex: 1;
      display: flex;
      position: relative;
      overflow: hidden;
    }

    .video-section {
      flex: 1;
      padding: 1rem;
      transition: margin-right 0.3s ease;

      &.chat-open {
        margin-right: 350px;
      }
    }

    .video-grid {
      width: 100%;
      height: 100%;
      display: grid;
      gap: 8px;
      background: var(--dark-surface);
      border-radius: 1rem;
      padding: 1rem;

      &.grid-1 {
        grid-template-columns: 1fr;
      }

      &.grid-2 {
        grid-template-columns: 1fr 1fr;
      }

      &.grid-3 {
        grid-template-columns: 1fr 1fr;
        grid-template-rows: 1fr 1fr;
      }

      &.grid-4 {
        grid-template-columns: 1fr 1fr;
        grid-template-rows: 1fr 1fr;
      }

      &.grid-many {
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      }
    }

    .video-participant {
      position: relative;
      background: var(--dark-card);
      border-radius: 0.75rem;
      overflow: hidden;
      min-height: 200px;

      &.local-video {
        border: 2px solid var(--primary-color);
      }

      .video-container {
        width: 100%;
        height: 100%;
        position: relative;

        .video-element {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #374151 0%, #4b5563 100%);

          video {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }
        }

        .participant-overlay {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          background: linear-gradient(transparent, rgba(0, 0, 0, 0.8));
          padding: 1rem;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;

          .participant-name {
            color: white;
            font-weight: 600;
            font-size: 0.875rem;
          }

          .participant-status {
            display: flex;
            gap: 0.25rem;

            .status-icon {
              width: 24px;
              height: 24px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 0.75rem;

              &.muted {
                background: var(--secondary-color);
                color: white;
              }

              &.sharing {
                background: var(--success-color);
                color: white;
              }

              &.raised-hand {
                background: var(--warning-color);
                color: white;
                animation: shake 1s infinite;
              }

              &.host {
                background: var(--primary-color);
                color: white;
              }
            }
          }
        }
      }
    }

    .chat-sidebar {
      position: absolute;
      right: 0;
      top: 0;
      bottom: 0;
      width: 350px;
      background: var(--dark-surface);
      border-left: 1px solid var(--dark-card);
      display: flex;
      flex-direction: column;
      transform: translateX(100%);
      transition: transform 0.3s ease;

      &.open {
        transform: translateX(0);
      }

      .chat-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem;
        border-bottom: 1px solid var(--dark-card);

        h3 {
          font-size: 1rem;
          font-weight: 600;
          color: var(--text-light);

          i {
            color: var(--primary-color);
            margin-right: 0.5rem;
          }
        }

        .chat-toggle {
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

      .chat-messages {
        flex: 1;
        overflow-y: auto;
        padding: 1rem;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;

        .chat-message {
          &.system-message {
            .system-content {
              background: rgba(79, 70, 229, 0.1);
              color: var(--primary-color);
              padding: 0.5rem;
              border-radius: 0.5rem;
              font-size: 0.875rem;
              display: flex;
              align-items: center;
              gap: 0.5rem;
              text-align: center;
              justify-content: center;
            }
          }

          &.own-message {
            .message-content {
              background: var(--primary-color);
              margin-left: 2rem;

              .message-header .sender-name {
                color: rgba(255, 255, 255, 0.9);
              }

              .message-text {
                color: white;
              }
            }
          }

          .message-content {
            background: var(--dark-card);
            border-radius: 0.75rem;
            padding: 0.75rem;
            margin-right: 2rem;

            .message-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 0.25rem;

              .sender-name {
                font-weight: 600;
                font-size: 0.875rem;
                color: var(--text-light);
              }

              .message-time {
                font-size: 0.75rem;
                color: var(--text-secondary);
              }
            }

            .message-text {
              color: var(--text-light);
              line-height: 1.4;
              word-wrap: break-word;
            }
          }
        }
      }

      .chat-input {
        padding: 1rem;
        border-top: 1px solid var(--dark-card);

        .input-group {
          display: flex;
          gap: 0.5rem;

          .message-input {
            flex: 1;
            padding: 0.75rem;
            border: 1px solid var(--dark-card);
            border-radius: 0.5rem;
            background: var(--dark-card);
            color: var(--text-light);
            font-size: 0.875rem;

            &:focus {
              outline: none;
              border-color: var(--primary-color);
            }

            &::placeholder {
              color: var(--text-secondary);
            }
          }

          .send-button {
            background: var(--primary-color);
            border: none;
            color: white;
            padding: 0.75rem;
            border-radius: 0.5rem;
            cursor: pointer;
            min-width: 44px;

            &:hover:not(:disabled) {
              background: var(--primary-hover);
            }

            &:disabled {
              opacity: 0.5;
              cursor: not-allowed;
            }
          }
        }
      }
    }

    .meeting-controls {
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 1.5rem 2rem;
      background: var(--dark-surface);
      border-top: 1px solid var(--dark-card);
      gap: 2rem;

      .control-group {
        display: flex;
        gap: 0.5rem;
      }

      .control-button {
        width: 56px;
        height: 56px;
        border-radius: 50%;
        border: none;
        background: var(--dark-card);
        color: var(--text-light);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.25rem;
        transition: all 0.2s;
        position: relative;

        &:hover {
          background: var(--primary-color);
          transform: translateY(-2px);
        }

        &.active {
          background: var(--primary-color);
        }

        &.muted {
          background: var(--secondary-color);
        }

        &.end-call {
          background: var(--secondary-color);

          &:hover {
            background: #dc2626;
          }
        }

        .notification-badge, .count-badge {
          position: absolute;
          top: -4px;
          right: -4px;
          background: var(--secondary-color);
          color: white;
          border-radius: 50%;
          width: 20px;
          height: 20px;
          font-size: 0.75rem;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
        }

        .count-badge {
          background: var(--primary-color);
        }
      }
    }

    .participants-panel {
      position: absolute;
      right: 0;
      top: 0;
      bottom: 0;
      width: 350px;
      background: var(--dark-surface);
      border-left: 1px solid var(--dark-card);
      transform: translateX(100%);
      transition: transform 0.3s ease;
      display: flex;
      flex-direction: column;

      &.open {
        transform: translateX(0);
      }

      .panel-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem;
        border-bottom: 1px solid var(--dark-card);

        h3 {
          font-size: 1rem;
          font-weight: 600;
          color: var(--text-light);

          i {
            color: var(--primary-color);
            margin-right: 0.5rem;
          }
        }

        .panel-close {
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

      .participants-list {
        flex: 1;
        overflow-y: auto;
        padding: 0.5rem;

        .participant-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          margin-bottom: 0.5rem;
          background: var(--dark-card);
          border-radius: 0.5rem;

          .participant-info {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            flex: 1;

            .participant-avatar {
              width: 40px;
              height: 40px;
              background: var(--primary-color);
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
            }

            .participant-details {
              .participant-name {
                font-weight: 600;
                color: var(--text-light);
                display: block;
                margin-bottom: 0.25rem;

                .you-label {
                  color: var(--text-secondary);
                  font-weight: normal;
                  font-size: 0.875rem;
                }
              }

              .participant-badges {
                display: flex;
                gap: 0.25rem;

                .badge {
                  font-size: 0.75rem;
                  padding: 0.125rem 0.5rem;
                  border-radius: 1rem;
                  display: flex;
                  align-items: center;
                  gap: 0.25rem;

                  &.host-badge {
                    background: var(--primary-color);
                    color: white;
                  }

                  &.raised-hand-badge {
                    background: var(--warning-color);
                    color: white;
                    animation: pulse 2s infinite;
                  }
                }
              }
            }
          }

          .participant-actions {
            display: flex;
            gap: 0.25rem;

            .action-button {
              width: 32px;
              height: 32px;
              border-radius: 50%;
              border: none;
              background: var(--dark-bg);
              color: var(--text-secondary);
              cursor: pointer;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 0.875rem;

              &:hover {
                color: var(--text-light);
                background: var(--primary-color);
              }

              &.remove:hover {
                background: var(--secondary-color);
              }
            }
          }
        }
      }
    }

    .loading-overlay, .error-overlay {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(17, 24, 39, 0.95);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .loading-content, .error-content {
      text-align: center;
      color: var(--text-light);

      h3 {
        font-size: 1.5rem;
        font-weight: 600;
        margin: 1rem 0 0.5rem;
      }

      p {
        color: var(--text-secondary);
        margin-bottom: 2rem;
      }

      .spinner.large {
        width: 48px;
        height: 48px;
        border-width: 4px;
      }
    }

    .error-content {
      i {
        font-size: 3rem;
        color: var(--secondary-color);
        margin-bottom: 1rem;
      }
    }

    @keyframes pulse {
      0%, 100% {
        opacity: 1;
      }
      50% {
        opacity: 0.5;
      }
    }

    @keyframes shake {
      0%, 100% {
        transform: rotate(0deg);
      }
      25% {
        transform: rotate(-10deg);
      }
      75% {
        transform: rotate(10deg);
      }
    }

    @media (max-width: 768px) {
      .meeting-header {
        padding: 0.75rem 1rem;

        .meeting-info h2 {
          font-size: 1rem;
        }

        .meeting-details {
          font-size: 0.8125rem;
        }
      }

      .video-section {
        padding: 0.5rem;

        &.chat-open {
          margin-right: 0;
        }
      }

      .video-grid {
        padding: 0.5rem;

        &.grid-2,
        &.grid-3,
        &.grid-4 {
          grid-template-columns: 1fr;
        }
      }

      .chat-sidebar,
      .participants-panel {
        width: 100%;
      }

      .meeting-controls {
        padding: 1rem;
        gap: 1rem;

        .control-button {
          width: 48px;
          height: 48px;
          font-size: 1rem;
        }
      }
    }
  `]
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
  isRecording: boolean = false;
  isChatOpen: boolean = false;
  isParticipantsOpen: boolean = false;
  isFullscreen: boolean = false;
  
  newMessage: string = '';
  unreadMessages: number = 0;
  
  private subscriptions: Subscription[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private openTokService: OpenTokService,
    private meetingService: MeetingService,
    private screenshotService: ScreenshotService
  ) {}

  async ngOnInit(): Promise<void> {
    this.meetingId = this.route.snapshot.paramMap.get('id') || '';
    const queryParams = this.route.snapshot.queryParams;
    const participantName = queryParams['name'] || 'Anonymous';
    const isHost = queryParams['host'] === 'true';

    await this.initializeMeeting(participantName, isHost);
    this.subscribeToServices();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.openTokService.disconnect();
  }

  private async initializeMeeting(participantName: string, isHost: boolean): Promise<void> {
    try {
      const meeting = this.meetingService.getCurrentMeeting();
      if (!meeting) {
        const newMeeting = await this.meetingService.joinMeeting(this.meetingId, participantName);
        this.currentMeeting = newMeeting;
      } else {
        this.currentMeeting = meeting;
      }

      await this.openTokService.initializeSession(
        this.currentMeeting.apiKey,
        this.currentMeeting.sessionId,
        this.currentMeeting.token,
        participantName
      );

      this.isConnecting = false;
    } catch (error) {
      console.error('Failed to initialize meeting:', error);
      this.connectionError = 'Failed to connect to the meeting. Please check your connection and try again.';
      this.isConnecting = false;
    }
  }

  private subscribeToServices(): void {
    // Subscribe to participants
    const participantsSub = this.openTokService.participants$.subscribe(participants => {
      this.participants = participants;
      this.currentUser = this.openTokService.getCurrentUser();
      this.remoteParticipants = participants.filter(p => p.id !== this.currentUser?.id);
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
    });

    // Subscribe to connection status
    const connectionSub = this.openTokService.connectionStatus$.subscribe(status => {
      if (status === 'disconnected' && !this.isConnecting) {
        this.connectionError = 'Connection lost. Please refresh the page.';
      }
    });

    this.subscriptions.push(participantsSub, chatSub, recordingSub, connectionSub);
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
    this.openTokService.toggleVideo();
  }

  async toggleScreenShare(): Promise<void> {
    try {
      if (this.currentUser?.isScreenSharing) {
        this.openTokService.stopScreenSharing();
      } else {
        await this.openTokService.startScreenSharing();
      }
    } catch (error) {
      console.error('Failed to toggle screen sharing:', error);
    }
  }

  async takeScreenshot(): Promise<void> {
    try {
      const videoGrid = document.querySelector('.video-grid') as HTMLElement;
      const screenshot = await this.screenshotService.captureVideoCall(videoGrid);
      await this.screenshotService.shareScreenshot(screenshot, 'Meeting Screenshot');
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
      } else {
        this.meetingService.startRecording();
      }
    }
  }

  toggleFullscreen(): void {
    this.isFullscreen = !this.isFullscreen;
  }

  // Chat Methods
  sendMessage(): void {
    if (this.newMessage.trim() && this.currentUser) {
      this.openTokService.sendChatMessage(this.newMessage.trim());
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
    // Implement settings modal
    console.log('Opening settings...');
  }

  async retryConnection(): Promise<void> {
    this.connectionError = '';
    this.isConnecting = true;
    const queryParams = this.route.snapshot.queryParams;
    const participantName = queryParams['name'] || 'Anonymous';
    const isHost = queryParams['host'] === 'true';
    await this.initializeMeeting(participantName, isHost);
  }

  leaveMeeting(): void {
    const confirmLeave = confirm('Are you sure you want to leave the meeting?');
    if (confirmLeave) {
      this.openTokService.disconnect();
      if (this.currentUser?.isHost) {
        this.meetingService.endMeeting();
      }
      this.router.navigate(['/']);
    }
  }

  trackByMessageId(index: number, message: ChatMessage): string {
    return message.id;
  }
}