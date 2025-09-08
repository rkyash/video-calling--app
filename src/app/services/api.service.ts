import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError, from } from 'rxjs';
import { retry, timeout, catchError, switchMap } from 'rxjs/operators';
import { ConfigService } from './config.service';
import {
  CreateMeetingRequest,
  CreateMeetingResponse,
  JoinMeetingRequest,
  JoinMeetingResponse
} from '../models/meeting.model';
import { ApiResponse } from '../models/api-response.model';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  // private readonly httpOptions = {
  //   headers: new HttpHeaders({
  //     'Content-Type': 'application/json'
  //   })
  // };
  private apiUrl: string = '';

  constructor(
    private http: HttpClient,
    private configService: ConfigService
  ) {
    // this.configService.getConfigAsync()
    //   .then(config => {
    //     this.apiUrl = config.apiUrl;
    //   })
    //   .catch(() => {
    //     this.apiUrl = '';
    //   });

      this.apiUrl = this.configService.getApiUrl();
  }

  createMeeting(meetingData: CreateMeetingRequest): Observable<CreateMeetingResponse> {
    let url = `${this.apiUrl}/meetings`;
    return this.http.post<CreateMeetingResponse>(url, meetingData);
  }

  joinMeeting(roomCode: string, joinData: JoinMeetingRequest = {}): Observable<JoinMeetingResponse> {
    let url = `${this.apiUrl}/meetings/${roomCode}/join`;
    return this.http.post<JoinMeetingResponse>(url, joinData);
  }

  startRecording(roomCode: string, joinData: JoinMeetingRequest = {}): Observable<JoinMeetingResponse> {
    let url = `${this.apiUrl}/${roomCode}/recordings/start`;
    return this.http.post<JoinMeetingResponse>(url, joinData);
  }

  disconnectParticipant(roomCode: string): Observable<ApiResponse> {
    let url = `${this.apiUrl}/meetings/${roomCode}/disconnect/`;
    return this.http.post<ApiResponse>(url,{});
  }

  // private makeRequest<T>(
  //   method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  //   endpoint: string,
  //   labelKey: keyof import('../config/app-config.interface').IApiLabels,
  //   body?: any
  // ): Observable<T> {
  //   // Use switchMap to properly chain the config loading with HTTP request
  //   return from(this.configService.getConfigAsync()).pipe(
  //     switchMap(config => {
  //       const url = this.configService.getFullApiUrl(endpoint);
  //       const label = this.configService.getApiLabel(labelKey);
  //       const timeoutMs = config.timeout || 30000;
  //       const retryAttempts = config.retryAttempts || 3;

  //       console.log(`[${label}] Making ${method} request to: ${url}`);

  //       let request$: Observable<T>;

  //       switch (method) {
  //         case 'GET':
  //           request$ = this.http.get<T>(url, this.httpOptions);
  //           break;
  //         case 'POST':
  //           request$ = this.http.post<T>(url, body, this.httpOptions);
  //           break;
  //         case 'PUT':
  //           request$ = this.http.put<T>(url, body, this.httpOptions);
  //           break;
  //         case 'DELETE':
  //           request$ = this.http.delete<T>(url, this.httpOptions);
  //           break;
  //       }

  //       return request$.pipe(
  //         timeout(timeoutMs),
  //         retry(retryAttempts),
  //         catchError(error => {
  //           console.error(`[${label}] API call failed:`, error);
  //           return throwError(() => error);
  //         })
  //       );
  //     }),
  //     catchError(error => {
  //       console.error('Failed to load configuration for API request:', error);
  //       return throwError(() => error);
  //     })
  //   );
  // }

  // createMeeting(meetingData: CreateMeetingRequest): Observable<CreateMeetingResponse> {
  //   return this.makeRequest<CreateMeetingResponse>('POST', 'meetings', 'createMeeting', meetingData);
  // }

  // joinMeeting(roomCode: string, joinData: JoinMeetingRequest = {}): Observable<JoinMeetingResponse> {
  //   return this.makeRequest<JoinMeetingResponse>('POST', `meetings/${roomCode}/join`, 'joinMeeting', joinData);
  // }

  // endMeeting(meetingId: string): Observable<any> {
  //   return this.makeRequest('DELETE', `meetings/${meetingId}`, 'endMeeting');
  // }

  // getSessionToken(meetingId: string): Observable<any> {
  //   return this.makeRequest('GET', `meetings/${meetingId}/token`, 'getSessionToken');
  // }

  // uploadScreenshot(meetingId: string, screenshotData: any): Observable<any> {
  //   return this.makeRequest('POST', `meetings/${meetingId}/screenshots`, 'uploadScreenshot', screenshotData);
  // }
}