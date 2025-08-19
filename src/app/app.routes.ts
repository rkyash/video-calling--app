import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./components/home/home.component').then(m => m.HomeComponent)
  },
  {
    path: 'create',
    loadComponent: () => import('./components/create-meeting/create-meeting.component').then(m => m.CreateMeetingComponent)
  },
  {
    path: 'join/:id',
    loadComponent: () => import('./components/join-meeting/join-meeting.component').then(m => m.JoinMeetingComponent)
  },
  {
    path: 'meeting/:id',
    loadComponent: () => import('./components/meeting-room/meeting-room.component').then(m => m.MeetingRoomComponent)
  },
  {
    path: '**',
    redirectTo: ''
  }
];