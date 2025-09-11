// import { Injectable } from '@angular/core';
// import html2canvas from 'html2canvas';

// @Injectable({
//   providedIn: 'root'
// })
// export class ScreenshotService {

//   constructor() { }

//   async captureVideoCall(element?: HTMLElement): Promise<string> {
//     try {
//       const targetElement = element || document.querySelector('.video-grid') as HTMLElement;
      
//       if (!targetElement) {
//         throw new Error('No video element found to capture');
//       }

//       const canvas = await html2canvas(targetElement, {
//         allowTaint: true,
//         useCORS: true,
//         scale: 1,
//         logging: false,
//         backgroundColor: '#111827'
//       });

//       return canvas.toDataURL('image/png');
//     } catch (error) {
//       console.error('Failed to capture screenshot:', error);
//       throw error;
//     }
//   }

//   async captureScreen(): Promise<string> {
//     try {
//       const stream = await navigator.mediaDevices.getDisplayMedia({
//         video: true
//       });

//       return new Promise((resolve, reject) => {
//         const video = document.createElement('video');
//         video.srcObject = stream;
//         video.play();

//         video.onloadedmetadata = () => {
//           const canvas = document.createElement('canvas');
//           canvas.width = video.videoWidth;
//           canvas.height = video.videoHeight;
          
//           const ctx = canvas.getContext('2d');
//           if (ctx) {
//             ctx.drawImage(video, 0, 0);
            
//             stream.getTracks().forEach(track => track.stop());
            
//             resolve(canvas.toDataURL('image/png'));
//           } else {
//             reject(new Error('Failed to get canvas context'));
//           }
//         };

//         video.onerror = () => {
//           stream.getTracks().forEach(track => track.stop());
//           reject(new Error('Failed to capture screen'));
//         };
//       });
//     } catch (error) {
//       console.error('Failed to capture screen:', error);
//       throw error;
//     }
//   }

//   downloadImage(dataUrl: string, filename: string = 'screenshot.png'): void {
//     const link = document.createElement('a');
//     link.download = filename;
//     link.href = dataUrl;
//     document.body.appendChild(link);
//     link.click();
//     document.body.removeChild(link);
//   }

//   async shareScreenshot(dataUrl: string, title: string = 'Meeting Screenshot'): Promise<void> {
//     if (navigator.share) {
//       try {
//         const response = await fetch(dataUrl);
//         const blob = await response.blob();
//         const file = new File([blob], 'screenshot.png', { type: 'image/png' });

//         await navigator.share({
//           title,
//           files: [file]
//         });
//       } catch (error) {
//         console.error('Failed to share screenshot:', error);
//         this.fallbackShare(dataUrl);
//       }
//     } else {
//       this.fallbackShare(dataUrl);
//     }
//   }

//   private fallbackShare(dataUrl: string): void {
//     if (navigator.clipboard && navigator.clipboard.write) {
//       fetch(dataUrl)
//         .then(res => res.blob())
//         .then(blob => {
//           const item = new ClipboardItem({ 'image/png': blob });
//           return navigator.clipboard.write([item]);
//         })
//         .then(() => {
//           console.log('Screenshot copied to clipboard');
//         })
//         .catch(err => {
//           console.error('Failed to copy to clipboard:', err);
//           this.downloadImage(dataUrl, `meeting-screenshot-${Date.now()}.png`);
//         });
//     } else {
//       this.downloadImage(dataUrl, `meeting-screenshot-${Date.now()}.png`);
//     }
//   }
// }


import { Injectable } from "@angular/core";
import { ToastService } from "./toast.service";

@Injectable({
  providedIn: "root",
})
export class ScreenshotService {
  private fileCounter = 1;
  constructor(private toastService: ToastService) { }

  async takeScreenshot(): Promise<void> {
    try {
      const videoElements = document.querySelectorAll("video");
      if (!videoElements.length) {
        throw new Error("No video streams found");
      }

      const canvas = document.createElement("canvas");
      const video = videoElements[0] as HTMLVideoElement;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        throw new Error("Failed to get canvas context");
      }

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert to blob and save
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => resolve(b!), "image/png");
      });
      const formatDate = () => {
        const now = new Date();
        const pad = (n: number) => n.toString().padStart(2, '0');
        
        return `${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear()}_${pad(now.getHours())}_${pad(now.getMinutes())}_${pad(now.getSeconds())}`;
       };
   
      // Generate the dynamic filename
      const dynamicValue = this.fileCounter++;
      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `S_${dynamicValue.toString().padStart(3, '0')}_${formatDate()}.png`;
      a.click();

      URL.revokeObjectURL(url);
      this.toastService.success("Screenshot saved", "warning");
    } catch (error) {
      this.toastService.error("Failed to take screenshot");
    }
  }
}
