import { ApiResponse } from './api-response.model';

// API Request/Response Types
export interface CreateMeetingRequest {
  title: string;
  description?: string | null;
  scheduledAt: string;
  createdById: number;
  isRecordingEnabled: boolean;
  isScreenSharingEnabled: boolean;
  maxParticipants: number;
  roomCode?: string | null;
}

export interface MeetingData {
  id: number;
  title: string;
  description: string | null;
  sessionId: string;
  roomCode: string;
  scheduledAt: string;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
  createdById: number | null;
  createdByName: string;
  isRecordingEnabled: boolean;
  isScreenSharingEnabled: boolean;
  maxParticipants: number;
  status: number;
  participantCount: number;
}

export type CreateMeetingResponse = ApiResponse<MeetingData>;

// Join Meeting Types
export interface JoinMeetingRequest {
  userName?: string;
  guestName?: string;
  guestEmail?: string;
  joinSettings?: JoinSettings;
}

export interface JoinSettings {
  audioEnabled: boolean;
  videoEnabled: boolean;
  autoMuteAudio?: boolean;
  autoMuteVideo?: boolean;
}

export interface JoinMeetingData {
  id: number;
  meetingId: number;
  userId: number | null;
  userName: string | null;
  guestName: string | null;
  guestEmail: string | null;
  joinedAt: string;
  leftAt: string | null;
  role: ParticipantRole;
  isMuted: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
  sessionId: string | null;
  token: string | null;
  apiKey: string | null;
}

export type JoinMeetingResponse = ApiResponse<JoinMeetingData>;

// Legacy Meeting interface (keeping for backward compatibility)
export interface Meeting {
  id: string;
  name: string;
  hostId: string;
  sessionId: string;
  token: string;
  apiKey: string;
  createdAt: Date;
  isRecording?: boolean;
  isHost: boolean;
}

export interface Participant {
  id: string;
  name: string;
  isHost: boolean;
  isAudioMuted: boolean;
  isVideoMuted: boolean;
  isScreenSharing: boolean;
  hasRaisedHand: boolean;
  connectionId: string;
}

export interface ChatMessage {
  id: string;
  participantId: string;
  participantName: string;
  message: string;
  timestamp: Date;
  type: 'text' | 'system';
}

export interface MediaDevices {
  audioDevices: MediaDeviceInfo[];
  videoDevices: MediaDeviceInfo[];
  currentAudioDevice?: string;
  currentVideoDevice?: string;
}

export interface MeetingSettings {
  audioEnabled: boolean;
  videoEnabled: boolean;
  screenShareEnabled: boolean;
  chatEnabled: boolean;
  recordingEnabled: boolean;
  participantLimit: number;
}

export enum ParticipantRole {
  Host = 0,
  Moderator = 1,
  Participant = 2,
  Guest = 3
}
