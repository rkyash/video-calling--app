import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../services/toast.service';

interface MediaDeviceInfo {
  deviceId: string;
  label: string;
  kind: string;
}

interface Settings {
  selectedCamera: string;
  selectedMicrophone: string;
  selectedSpeaker: string;
  videoQuality: string;
  audioQuality: string;
  enableNoiseCancellation: boolean;
  enableEchoCancellation: boolean;
  enableAutoGainControl: boolean;
}

@Component({
  selector: 'app-settings-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="settings-overlay" *ngIf="isOpen" (click)="closeModal()">
      <div class="settings-modal" (click)="$event.stopPropagation()">
        <div class="settings-header">
          <h2><i class="fas fa-cog"></i> Meeting Settings</h2>
          <button class="close-button" (click)="closeModal()">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <div class="settings-content">
          <!-- Camera Settings -->
          <div class="settings-section">
            <h3><i class="fas fa-video"></i> Camera</h3>
            <div class="device-selection">
              <label for="camera-select">Select Camera:</label>
              <select 
                id="camera-select" 
                [(ngModel)]="settings.selectedCamera"
                (change)="onCameraChange()"
                class="device-select"
              >
                <option value="">Default Camera</option>
                <option 
                  *ngFor="let camera of cameras" 
                  [value]="camera.deviceId"
                >
                  {{ camera.label || 'Camera ' + camera.deviceId.substring(0, 8) }}
                </option>
              </select>
            </div>
            
            <div class="quality-selection">
              <label for="video-quality">Video Quality:</label>
              <select 
                id="video-quality" 
                [(ngModel)]="settings.videoQuality"
                class="quality-select"
              >
                <option value="low">Low (240p)</option>
                <option value="medium">Medium (480p)</option>
                <option value="high">High (720p)</option>
                <option value="hd">HD (1080p)</option>
              </select>
            </div>
          </div>

          <!-- Microphone Settings -->
          <div class="settings-section">
            <h3><i class="fas fa-microphone"></i> Microphone</h3>
            <div class="device-selection">
              <label for="microphone-select">Select Microphone:</label>
              <select 
                id="microphone-select" 
                [(ngModel)]="settings.selectedMicrophone"
                (change)="onMicrophoneChange()"
                class="device-select"
              >
                <option value="">Default Microphone</option>
                <option 
                  *ngFor="let mic of microphones" 
                  [value]="mic.deviceId"
                >
                  {{ mic.label || 'Microphone ' + mic.deviceId.substring(0, 8) }}
                </option>
              </select>
            </div>
            
            <div class="quality-selection">
              <label for="audio-quality">Audio Quality:</label>
              <select 
                id="audio-quality" 
                [(ngModel)]="settings.audioQuality"
                class="quality-select"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            <!-- Audio Enhancement Options -->
            <div class="audio-enhancements">
              <div class="checkbox-option">
                <input 
                  type="checkbox" 
                  id="noise-cancellation"
                  [(ngModel)]="settings.enableNoiseCancellation"
                >
                <label for="noise-cancellation">Enable Noise Cancellation</label>
              </div>
              
              <div class="checkbox-option">
                <input 
                  type="checkbox" 
                  id="echo-cancellation"
                  [(ngModel)]="settings.enableEchoCancellation"
                >
                <label for="echo-cancellation">Enable Echo Cancellation</label>
              </div>
              
              <div class="checkbox-option">
                <input 
                  type="checkbox" 
                  id="auto-gain"
                  [(ngModel)]="settings.enableAutoGainControl"
                >
                <label for="auto-gain">Enable Auto Gain Control</label>
              </div>
            </div>
          </div>

          <!-- Speaker Settings -->
          <div class="settings-section">
            <h3><i class="fas fa-volume-up"></i> Speaker</h3>
            <div class="device-selection">
              <label for="speaker-select">Select Speaker:</label>
              <select 
                id="speaker-select" 
                [(ngModel)]="settings.selectedSpeaker"
                (change)="onSpeakerChange()"
                class="device-select"
              >
                <option value="">Default Speaker</option>
                <option 
                  *ngFor="let speaker of speakers" 
                  [value]="speaker.deviceId"
                >
                  {{ speaker.label || 'Speaker ' + speaker.deviceId.substring(0, 8) }}
                </option>
              </select>
            </div>
            
            <!-- Test Audio Button -->
            <button 
              class="test-audio-button"
              (click)="testAudio()"
              [disabled]="isTestingAudio"
            >
              <i class="fas fa-play" *ngIf="!isTestingAudio"></i>
              <i class="fas fa-spinner fa-spin" *ngIf="isTestingAudio"></i>
              {{ isTestingAudio ? 'Testing...' : 'Test Audio' }}
            </button>
          </div>
        </div>

        <div class="settings-footer">
          <button class="btn btn-secondary" (click)="resetToDefaults()">
            Reset to Defaults
          </button>
          <div class="footer-actions">
            <button class="btn btn-outline" (click)="closeModal()">
              Cancel
            </button>
            <button class="btn btn-primary" (click)="saveSettings()">
              <i class="fas fa-save"></i> Apply Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .settings-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      backdrop-filter: blur(4px);
    }

    .settings-modal {
      background: var(--dark-surface);
      border: 1px solid var(--dark-card);
      border-radius: 1rem;
      width: 600px;
      max-width: 90vw;
      max-height: 90vh;
      overflow: hidden;
      box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
    }

    .settings-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.5rem;
      border-bottom: 1px solid var(--dark-card);
      background: var(--dark-bg);

      h2 {
        font-size: 1.25rem;
        font-weight: 600;
        color: var(--text-light);
        display: flex;
        align-items: center;
        gap: 0.5rem;

        i {
          color: var(--primary-color);
        }
      }

      .close-button {
        background: none;
        border: none;
        color: var(--text-secondary);
        cursor: pointer;
        padding: 0.5rem;
        border-radius: 0.25rem;
        transition: all 0.2s;

        &:hover {
          color: var(--text-light);
          background: var(--dark-card);
        }

        i {
          font-size: 1.25rem;
        }
      }
    }

    .settings-content {
      padding: 1.5rem;
      max-height: 60vh;
      overflow-y: auto;
    }

    .settings-section {
      margin-bottom: 2rem;

      &:last-child {
        margin-bottom: 0;
      }

      h3 {
        font-size: 1.1rem;
        font-weight: 600;
        color: var(--text-light);
        margin-bottom: 1rem;
        display: flex;
        align-items: center;
        gap: 0.5rem;

        i {
          color: var(--primary-color);
          width: 20px;
        }
      }
    }

    .device-selection, .quality-selection {
      margin-bottom: 1rem;

      label {
        display: block;
        font-weight: 500;
        color: var(--text-light);
        margin-bottom: 0.5rem;
        font-size: 0.875rem;
      }

      .device-select, .quality-select {
        width: 100%;
        padding: 0.75rem;
        background: var(--dark-card);
        border: 1px solid var(--dark-card);
        border-radius: 0.5rem;
        color: var(--text-light);
        font-size: 0.875rem;

        &:focus {
          outline: none;
          border-color: var(--primary-color);
          background: var(--dark-bg);
        }

        option {
          background: var(--dark-card);
          color: var(--text-light);
        }
      }
    }

    .audio-enhancements {
      margin-top: 1rem;
      padding-top: 1rem;
      border-top: 1px solid var(--dark-card);
    }

    .checkbox-option {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.75rem;

      input[type="checkbox"] {
        width: 16px;
        height: 16px;
        accent-color: var(--primary-color);
      }

      label {
        color: var(--text-light);
        font-size: 0.875rem;
        cursor: pointer;
        margin: 0;
      }
    }

    .test-audio-button {
      background: var(--primary-color);
      border: none;
      color: white;
      padding: 0.75rem 1.5rem;
      border-radius: 0.5rem;
      cursor: pointer;
      font-size: 0.875rem;
      margin-top: 1rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      transition: all 0.2s;

      &:hover:not(:disabled) {
        background: var(--primary-hover);
      }

      &:disabled {
        opacity: 0.7;
        cursor: not-allowed;
      }

      .fa-spinner {
        animation: spin 1s linear infinite;
      }
    }

    .settings-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.5rem;
      border-top: 1px solid var(--dark-card);
      background: var(--dark-bg);

      .footer-actions {
        display: flex;
        gap: 0.75rem;
      }
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    @media (max-width: 640px) {
      .settings-modal {
        width: 95vw;
        margin: 1rem;
      }

      .settings-footer {
        flex-direction: column;
        gap: 1rem;
        align-items: stretch;

        .footer-actions {
          justify-content: center;
        }
      }
    }
  `]
})
export class SettingsModalComponent implements OnInit {
  @Input() isOpen: boolean = false;
  @Output() close = new EventEmitter<void>();
  @Output() settingsChange = new EventEmitter<Settings>();

  cameras: MediaDeviceInfo[] = [];
  microphones: MediaDeviceInfo[] = [];
  speakers: MediaDeviceInfo[] = [];
  isTestingAudio: boolean = false;

  settings: Settings = {
    selectedCamera: '',
    selectedMicrophone: '',
    selectedSpeaker: '',
    videoQuality: 'medium',
    audioQuality: 'medium',
    enableNoiseCancellation: true,
    enableEchoCancellation: true,
    enableAutoGainControl: true
  };

  constructor(private toastService: ToastService) {}

  async ngOnInit(): Promise<void> {
    await this.loadMediaDevices();
    this.loadSavedSettings();
  }

  async loadMediaDevices(): Promise<void> {
    try {
      // Request permissions first
      await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      
      const devices = await navigator.mediaDevices.enumerateDevices();
      
      this.cameras = devices.filter(device => device.kind === 'videoinput')
        .map(device => ({
          deviceId: device.deviceId,
          label: device.label,
          kind: device.kind
        }));

      this.microphones = devices.filter(device => device.kind === 'audioinput')
        .map(device => ({
          deviceId: device.deviceId,
          label: device.label,
          kind: device.kind
        }));

      this.speakers = devices.filter(device => device.kind === 'audiooutput')
        .map(device => ({
          deviceId: device.deviceId,
          label: device.label,
          kind: device.kind
        }));
    } catch (error) {
      console.error('Failed to load media devices:', error);
      this.toastService.error('Device Access', 'Failed to load media devices. Please check permissions.');
    }
  }

  loadSavedSettings(): void {
    const savedSettings = localStorage.getItem('meetingSettings');
    if (savedSettings) {
      try {
        this.settings = { ...this.settings, ...JSON.parse(savedSettings) };
      } catch (error) {
        console.error('Failed to load saved settings:', error);
      }
    }
  }

  onCameraChange(): void {
    // Preview logic can be added here
    console.log('Camera changed to:', this.settings.selectedCamera);
  }

  onMicrophoneChange(): void {
    // Preview logic can be added here
    console.log('Microphone changed to:', this.settings.selectedMicrophone);
  }

  onSpeakerChange(): void {
    // Preview logic can be added here
    console.log('Speaker changed to:', this.settings.selectedSpeaker);
  }

  async testAudio(): Promise<void> {
    this.isTestingAudio = true;
    try {
      // Play a test tone or sound
      const audioContext = new AudioContext();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      
      oscillator.start();
      
      setTimeout(() => {
        oscillator.stop();
        audioContext.close();
        this.isTestingAudio = false;
        this.toastService.info('Audio Test', 'Test audio played successfully');
      }, 1000);
    } catch (error) {
      this.isTestingAudio = false;
      console.error('Audio test failed:', error);
      this.toastService.error('Audio Test', 'Failed to play test audio');
    }
  }

  resetToDefaults(): void {
    this.settings = {
      selectedCamera: '',
      selectedMicrophone: '',
      selectedSpeaker: '',
      videoQuality: 'medium',
      audioQuality: 'medium',
      enableNoiseCancellation: true,
      enableEchoCancellation: true,
      enableAutoGainControl: true
    };
    this.toastService.info('Settings Reset', 'Settings reset to defaults');
  }

  saveSettings(): void {
    try {
      localStorage.setItem('meetingSettings', JSON.stringify(this.settings));
      this.settingsChange.emit(this.settings);
      this.toastService.success('Settings Saved', 'Your settings have been applied');
      this.closeModal();
    } catch (error) {
      console.error('Failed to save settings:', error);
      this.toastService.error('Save Failed', 'Failed to save settings');
    }
  }

  closeModal(): void {
    this.close.emit();
  }
}