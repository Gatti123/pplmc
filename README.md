# Polemica - Video Chat Discussion Platform

Polemica is a platform that connects people for meaningful discussions on various topics through video chat.

## Features

- **Topic-based matching**: Find discussion partners based on shared interests
- **Video chat**: Real-time video and audio communication using WebRTC
- **Customizable filters**: Filter by language, region, and role
- **Device check**: Test your camera and microphone before joining discussions
- **Online user counter**: See how many people are available for each topic
- **Conversation starters**: Get suggestions for discussion topics

## Technology Stack

- **Frontend**: Next.js with React and Tailwind CSS
- **Backend**: Firebase (Authentication, Firestore, Storage)
- **Real-time Communication**: WebRTC with Firebase signaling
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Firebase account
- Vercel account (for deployment)

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/polemica.git
   cd polemica
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env.local` file with your Firebase configuration:
   ```
   NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-auth-domain
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-storage-bucket
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
   NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
   ```

4. Run the development server:
   ```
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Firebase Setup

1. Create a Firebase project at [firebase.google.com](https://firebase.google.com)
2. Enable Authentication (Google sign-in)
3. Create a Firestore database
4. Set up security rules for Firestore

## Deployment

### Deploying to Vercel

1. Push your code to GitHub
2. Connect your GitHub repository to Vercel
3. Configure environment variables in Vercel dashboard
4. Deploy the project

## Usage Guide

1. **Sign In**: Use your Google account to sign in
2. **Select a Topic**: Browse and select a topic you're interested in
3. **Set Filters**: Choose your preferred language, region, and role
4. **Check Devices**: Verify your camera and microphone are working
5. **Start Discussion**: Click "Start Discussion" to find a partner
6. **Video Chat**: Once matched, you'll be connected via video chat
7. **End Discussion**: Click the hang-up button to end the discussion

## Troubleshooting

### Common Issues

- **Camera/Microphone Access**: Make sure your browser has permission to access your camera and microphone
- **Connection Issues**: Check your internet connection
- **Authentication Errors**: Clear browser cookies and try signing in again

### Mobile Device Support

- For mobile devices, the app uses redirect-based authentication instead of popups
- Make sure to allow camera and microphone access on your mobile device

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- WebRTC technology
- Firebase platform
- Next.js framework
- Tailwind CSS
