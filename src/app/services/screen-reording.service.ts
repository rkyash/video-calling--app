import { Injectable } from "@angular/core";
import { BehaviorSubject } from "rxjs";
import { ToastService } from "./toast.service";
// import html2canvas from 'html2canvas';

@Injectable({
  providedIn: "root",
})
export class ScreenRecordingService {
  private mediaRecorder!: MediaRecorder;
  private recordedChunks: Blob[] = [];
  isScreenRecording$ = new BehaviorSubject<boolean>(false);
  private fileCounter = 1;
  constructor(private toastService: ToastService) { }


  async startRecordingV1(): Promise<void> {
    try {
      // Get all video elements
      const videoElements = document.querySelectorAll('video');
      if (!videoElements.length) {
        throw new Error('No video streams found');
      }

      // Create a canvas that will fit all videos
      const canvas = document.createElement('canvas');
      const padding = 10; // Padding between videos
      const maxWidth = Math.max(...Array.from(videoElements).map(v => (v as HTMLVideoElement).videoWidth));
      const totalHeight = Array.from(videoElements)
        .map(v => (v as HTMLVideoElement).videoHeight)
        .reduce((sum, height) => sum + height + padding, -padding);

      canvas.width = maxWidth;
      canvas.height = totalHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Failed to get canvas context');
      }

      // Create a stream from the canvas
      const stream = canvas.captureStream(30); // 30 FPS

      // Get system audio
      const audioStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        }
      });

      // Add audio tracks to the canvas stream
      audioStream.getAudioTracks().forEach(track => {
        stream.addTrack(track);
      });

      this.recordedChunks = [];
      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/mp4'
      });


      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.recordedChunks, {
          type: 'video/mp4'
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `SR-${new Date().toISOString()}.mp4`;
        a.click();
        URL.revokeObjectURL(url);

        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
        audioStream.getTracks().forEach(track => track.stop());
        this.isScreenRecording$.next(false);
      };

      // Start recording frame by frame
      const drawFrame = () => {
        if (this.mediaRecorder?.state === 'recording') {
          // Clear the canvas
          ctx.fillStyle = '#202124'; // Match background color
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          // Draw each video element
          let yOffset = 0;
          videoElements.forEach((video: Element) => {
            const videoEl = video as HTMLVideoElement;
            ctx.drawImage(videoEl, 0, yOffset, videoEl.videoWidth, videoEl.videoHeight);
            yOffset += videoEl.videoHeight + padding;
          });

          requestAnimationFrame(drawFrame);
        }
      };

      this.mediaRecorder.start();
      this.isScreenRecording$.next(true);
      drawFrame();
    } catch (error) {
      this.toastService.error('Failed to start recording');
      this.isScreenRecording$.next(false);
      throw error;
    }
  }


  async startRecording(): Promise<void> {
    try {
      // Select the .video-container element
      const videoContainer = document.querySelector('.video-container') as HTMLElement;
      if (!videoContainer) {
        throw new Error('.video-container element not found');
      }

      // Create a canvas to match the size of .video-container
      const rect = videoContainer.getBoundingClientRect();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = rect.width;
      canvas.height = rect.height;

      if (!ctx) {
        throw new Error('Canvas context not available');
      }

      // Render the .video-container content
      const renderVideoContainer = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Recursive rendering function
        const drawElement = (element: HTMLElement, offsetX = rect.left, offsetY = rect.top) => {
          const elementRect = element.getBoundingClientRect();
          const x = elementRect.left - offsetX;
          const y = elementRect.top - offsetY;

          // Draw background color
          const style = getComputedStyle(element);
          if (style.backgroundColor && style.backgroundColor !== 'rgba(0, 0, 0, 0)') {
            ctx.fillStyle = style.backgroundColor;
            ctx.fillRect(x, y, elementRect.width, elementRect.height);
          }

          // Draw text
          if (element.innerText) {
            ctx.fillStyle = style.color || '#000';
            ctx.font = `${style.fontSize} ${style.fontFamily}`;
            ctx.fillText(element.innerText, x, y + parseFloat(style.fontSize));
          }

          // Draw images
          if (element instanceof HTMLImageElement) {
            ctx.drawImage(element, x, y, elementRect.width, elementRect.height);
          }

          // Draw videos
          if (element instanceof HTMLVideoElement && element.readyState >= 2) {
            ctx.drawImage(element, x, y, elementRect.width, elementRect.height);
          }

          // Process child elements
          Array.from(element.children).forEach((child) =>
            drawElement(child as HTMLElement, offsetX, offsetY)
          );
        };

        drawElement(videoContainer);
      };

      // Create a stream from the canvas
      const stream = canvas.captureStream(30); // 30 FPS

      // Get audio from the microphone
      const audioStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      // Combine audio and video streams
      audioStream.getAudioTracks().forEach((track) => {
        stream.addTrack(track);
      });

      this.recordedChunks = [];
      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm',
      });

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };

      const formatDate = () => {
        const now = new Date();
        const pad = (n: number) => n.toString().padStart(2, '0');
        
        return `${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear()}_${pad(now.getHours())}_${pad(now.getMinutes())}_${pad(now.getSeconds())}`;
       };
      // Generate the dynamic filename
      const dynamicValue = this.fileCounter++;
      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `V_${dynamicValue.toString().padStart(3, '0')}_${formatDate()}.webm`;
        a.click();
        URL.revokeObjectURL(url);

        // Stop all streams
        stream.getTracks().forEach((track) => track.stop());
        audioStream.getTracks().forEach((track) => track.stop());
        this.isScreenRecording$.next(false);
      };

      // Start rendering and recording
      const updateCanvas = () => {
        renderVideoContainer();
        if (this.mediaRecorder?.state === 'recording') {
          requestAnimationFrame(updateCanvas);
        }
      };

      this.mediaRecorder.start();
      this.isScreenRecording$.next(true);
      updateCanvas();
    } catch (error) {
      this.toastService.error('Failed to start recording');
      this.isScreenRecording$.next(false);
      console.log('Recording error:', error);
    }
  }




  async stopRecording(): Promise<void> {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
      this.isScreenRecording$.next(false);
    }
  }
}


