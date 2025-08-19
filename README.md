# VideoMeet - Professional Video Conferencing App

<div align="center">
  <img src="https://img.shields.io/badge/Angular-20.1.1-red.svg" alt="Angular">
  <img src="https://img.shields.io/badge/TypeScript-5.8.0-blue.svg" alt="TypeScript">
  <img src="https://img.shields.io/badge/License-MIT-green.svg" alt="License">
  <img src="https://img.shields.io/badge/Status-Production%20Ready-success.svg" alt="Status">
</div>

A full-featured video calling web application similar to Google Meet, built with Angular 20 and OpenTok SDK. Features professional video conferencing capabilities with modern UI/UX design.

## 🚀 Features

### Core Video Calling
- **Real-time Video & Audio** - Crystal-clear HD video calls with professional audio
- **Create & Join Meetings** - Generate unique meeting rooms with shareable links
- **Screen Sharing** - Share desktop, applications, or browser tabs
- **Meeting Recording** - Record meetings for later review (host feature)
- **Screenshot Capture** - Take and share meeting screenshots

### Communication Tools
- **In-call Chat** - Real-time messaging with timestamps
- **Raise Hand** - Non-disruptive way to get attention
- **Participant Status** - Visual indicators for muted, sharing, etc.

### Participant Management
- **Host Controls** - Mute, unmute, and remove participants
- **Participant List** - See all attendees with status indicators
- **Dynamic Video Grid** - Automatically adjusts layout based on participant count
- **Connection Status** - Real-time connection monitoring

### Modern UI/UX
- **Dark Theme Design** - Professional, eye-friendly interface
- **Mobile Responsive** - Works seamlessly on desktop, tablet, and mobile
- **Fullscreen Mode** - Distraction-free meeting experience
- **Smooth Animations** - Polished transitions and interactions

## 🛠️ Tech Stack

- **Frontend:** Angular 20.1.1 with Standalone Components
- **Video SDK:** OpenTok/Vonage for WebRTC functionality
- **Styling:** SCSS with CSS Custom Properties
- **TypeScript:** 5.8.0 with strict mode
- **State Management:** RxJS for reactive programming
- **Build Tool:** Angular CLI with Webpack optimization
- **Icons:** Font Awesome 6
- **Fonts:** Inter font family

## 📦 Installation

### Prerequisites
- Node.js (v18 or higher)
- npm (v8 or higher)
- Modern web browser with WebRTC support

### Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd video-meeting-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure OpenTok (Optional)**
   - Sign up for a free OpenTok/Vonage account
   - Replace the API key in `src/app/services/meeting.service.ts`
   - For production, implement proper token generation on your backend

4. **Start development server**
   ```bash
   npm start
   ```

5. **Open your browser**
   Navigate to `http://localhost:4200`

## 🎯 Usage

### Creating a Meeting

1. Go to the home page
2. Click "Start New Meeting"
3. Fill in your name and meeting details
4. Configure meeting settings (audio, video, chat, etc.)
5. Click "Create Meeting"
6. Share the generated meeting link or ID with participants

### Joining a Meeting

1. Visit the home page
2. Enter the meeting ID or paste the meeting link
3. Click "Join"
4. Set up your camera and microphone
5. Enter your name
6. Click "Join Meeting"

### During a Meeting

- **Toggle Audio/Video:** Use the control buttons at the bottom
- **Share Screen:** Click the screen share button
- **Open Chat:** Click the chat icon to send messages
- **Raise Hand:** Click the hand icon to get attention
- **Take Screenshot:** Capture the current meeting view
- **View Participants:** See all attendees and their status
- **Host Controls:** Mute participants or remove them (host only)

## 🏗️ Project Structure

```
src/
├── app/
│   ├── components/
│   │   ├── home/                    # Landing page
│   │   ├── create-meeting/          # Meeting creation form
│   │   ├── join-meeting/           # Pre-meeting lobby
│   │   └── meeting-room/           # Main video call interface
│   ├── services/
│   │   ├── opentok.service.ts      # Video calling logic
│   │   ├── meeting.service.ts      # Meeting management
│   │   └── screenshot.service.ts   # Screenshot functionality
│   ├── models/
│   │   └── meeting.model.ts        # TypeScript interfaces
│   └── app.routes.ts               # Routing configuration
├── styles.scss                     # Global styles and variables
├── index.html                      # Main HTML template
└── assets/                         # Static assets
```

## 🔧 Configuration

### Environment Variables
Create environment files for different deployment stages:

```typescript
// src/environments/environment.ts
export const environment = {
  production: false,
  opentokApiKey: 'your-api-key',
  opentokApiSecret: 'your-api-secret'
};
```

### Build Configuration
The app uses Angular CLI with optimized build settings:

```bash
# Development build
npm run build

# Production build
npm run build --prod

# Serve production build locally
npm run serve:prod
```

## 🎨 Customization

### Theming
The app uses CSS custom properties for easy theming:

```scss
// src/styles.scss
:root {
  --primary-color: #4F46E5;    // Change primary color
  --dark-bg: #111827;          // Change background
  --text-light: #FFFFFF;       // Change text color
  // ... other variables
}
```

### Adding Features
The modular architecture makes it easy to add new features:

1. Create new services in `src/app/services/`
2. Add components in `src/app/components/`
3. Update models in `src/app/models/`
4. Configure routing in `src/app/app.routes.ts`

## 🚦 Available Scripts

```bash
npm start          # Start development server
npm run build      # Build for production
npm test           # Run unit tests
npm run lint       # Lint code
npm run e2e        # Run end-to-end tests
```

## 🌐 Browser Support

- **Chrome:** 88+ (recommended)
- **Firefox:** 85+
- **Safari:** 14+
- **Edge:** 88+

*WebRTC features require HTTPS in production*

## 📱 Mobile Support

The app is fully responsive and supports:
- **iOS:** Safari 14+, Chrome, Firefox
- **Android:** Chrome 88+, Firefox 85+

## 🔒 Security Features

- **Input Validation:** All user inputs are sanitized
- **HTTPS Required:** WebRTC requires secure connections in production
- **No Data Storage:** Meetings are ephemeral, no personal data stored
- **Permission Controls:** Camera and microphone permissions properly managed

## 🐛 Troubleshooting

### Common Issues

1. **Camera/Microphone Not Working**
   - Ensure browser permissions are granted
   - Check if other applications are using the devices
   - Try refreshing the page

2. **Connection Issues**
   - Verify internet connection
   - Check firewall settings
   - Ensure WebRTC is supported

3. **Screen Sharing Not Working**
   - Use HTTPS (required for screen sharing)
   - Check browser compatibility
   - Ensure proper permissions

4. **Build Errors**
   - Clear node_modules: `rm -rf node_modules && npm install`
   - Update Angular CLI: `npm install -g @angular/cli@latest`

## 🚀 Deployment

### Development
```bash
npm start
```

### Production
```bash
# Build for production
npm run build

# Deploy dist/ folder to your web server
# Ensure HTTPS is configured for WebRTC features
```

### Docker (Optional)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 4200
CMD ["npm", "start"]
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Angular Team** - For the amazing framework
- **Vonage/OpenTok** - For video calling capabilities
- **Font Awesome** - For beautiful icons
- **Inter Font** - For clean typography

## 📞 Support

For support and questions:
- Create an issue on GitHub
- Check the troubleshooting section
- Review Angular and OpenTok documentation

---

<div align="center">
  <p>Built with ❤️ using Angular 20</p>
  <p>© 2025 VideoMeet. Professional Video Conferencing.</p>
</div>