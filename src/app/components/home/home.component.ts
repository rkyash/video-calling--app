import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit, OnDestroy {
  meetingId: string = '13643714';
  meetingCode: string = '13643714';
  originSiteUrl: string = '';
  token = "";
  private messageCount = 0;
  private maxMessages = 1000;

  constructor(private router: Router, private authService: AuthService) {

  }


  ngOnDestroy(): void {

  }
  ngOnInit(): void {



  }

  joinMeeting(): void {
    if (this.meetingId?.trim()) {
      const authPayload = { accessToken: this.token };
      this.authService.setAuthToken(authPayload);

      this.authService.loadUserProfile();

      let meetingId = this.meetingId.trim();

      if (meetingId.includes('/join/')) {
        meetingId = meetingId.split('/join/')[1];
      }

      this.router.navigate(['/join', meetingId]);
    }
  }


}