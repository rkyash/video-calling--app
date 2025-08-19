export interface Meeting {
  id: string;
  name: string;
  hostId: string;
  sessionId: string;
  token: string;
  apiKey: string;
  createdAt: Date;
  isRecording?: boolean;
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