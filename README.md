# Polemica - Video Discussion Platform

A real-time video discussion platform built with Next.js, Firebase, and WebRTC.

## Features

- Real-time video chat with WebRTC
- Text chat with Socket.IO
- Google Authentication
- Topic-based discussions
- User profiles and preferences
- Responsive design with Tailwind CSS

## Tech Stack

- Next.js 14
- Firebase (Authentication, Firestore, Storage)
- WebRTC for video chat
- Socket.IO for text chat
- Redux Toolkit for state management
- Tailwind CSS for styling

## Getting Started

1. Clone the repository:
```bash
git clone https://github.com/Gatti123/pplmc.git
cd pplmc
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env.local` file with your Firebase configuration:
```
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment

The project is configured for deployment on Vercel. Simply connect your GitHub repository to Vercel and it will automatically deploy your application.

## License

MIT
