import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError, from } from 'rxjs';
import { retry, timeout, catchError, switchMap } from 'rxjs/operators';
import { ConfigService } from './config.service';
import {
  CreateMeetingRequest,
  CreateMeetingResponse,
  JoinMeetingRequest,
  JoinMeetingResponse,
  RecordingRequest
} from '../models/meeting.model';
import { ApiResponse } from '../models/api-response.model';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiUrl: string = '';
  private configLoaded: boolean = false;

  constructor(
    private http: HttpClient,
    private configService: ConfigService
  ) {
    this.initializeConfig();
  }

  private async initializeConfig(): Promise<void> {
    try {
      const config = await this.configService.getConfigAsync();
      this.apiUrl = config.apiUrl;
      this.configLoaded = true;
      console.log(`API Service initialized with URL: ${this.apiUrl} (Environment: ${this.configService.getCurrentEnvironment()})`);
    } catch (error) {
      console.error('Failed to load API configuration, using fallback:', error);
      this.apiUrl = 'http://localhost:5052/api';
      this.configLoaded = true;
    }
  }

  private async ensureConfigLoaded(): Promise<void> {
    if (!this.configLoaded) {
      await this.initializeConfig();
    }
  }

  private async getApiUrl(): Promise<string> {
    await this.ensureConfigLoaded();
    return this.apiUrl;
  }

  createMeeting(meetingData: CreateMeetingRequest): Observable<CreateMeetingResponse> {
    return from(this.getApiUrl()).pipe(
      switchMap(apiUrl => {
        const url = `${apiUrl}/meetings`;
        console.log(`Creating meeting with URL: ${url}`);
        return this.http.post<CreateMeetingResponse>(url, meetingData);
      })
    );
  }

  joinMeeting(roomCode: string, joinData: JoinMeetingRequest = {}): Observable<JoinMeetingResponse> {
    return from(this.getApiUrl()).pipe(
      switchMap(apiUrl => {
        const url = `${apiUrl}/meetings/${roomCode}/join`;       
        return this.http.post<JoinMeetingResponse>(url, joinData);
      })
    );
  }

  startRecording(roomCode: string, data: RecordingRequest): Observable<JoinMeetingResponse> {
    return from(this.getApiUrl()).pipe(
      switchMap(apiUrl => {
        const url = `${apiUrl}/meetings/${roomCode}/recordings/start`;     
        return this.http.post<JoinMeetingResponse>(url, data);
      })
    );
  }

  disconnectParticipant(roomCode: string): Observable<ApiResponse<any>> {
    return from(this.getApiUrl()).pipe(
      switchMap(apiUrl => {
        const url = `${apiUrl}/meetings/${roomCode}/disconnect/`;        
        return this.http.post<ApiResponse<any>>(url, {});
      })
    );
  }

}