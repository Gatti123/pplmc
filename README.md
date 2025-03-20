# Polemica

Polemica is a platform for video chats in a chatroulette format, allowing users to engage in meaningful discussions with random partners based on selected topics.

## Features

- **Video Chat**: Random matching with filters for language and continent
- **Observer Mode**: Users can watch discussions without participating
- **Text Chat**: Parallel text communication during video discussions
- **Discussion Timer**: Optional timer for discussions (5, 10, or 15 minutes)
- **Topic Selection**: Choose from a variety of discussion topics
- **User Profiles**: Customize your profile with avatar and bio
- **Recent Discussions**: View and continue recent discussions
- **Authentication**: Sign in with email or Google

## Tech Stack

- **Frontend**: Next.js, React, Tailwind CSS
- **Backend**: Firebase (Authentication, Firestore, Storage)
- **Video Chat**: Twilio Video
- **Deployment**: Vercel / Firebase Hosting

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- npm or yarn
- Firebase account
- Twilio account

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/polemica.git
   cd polemica
   ```

2. Install dependencies:
   ```
   npm install
   # or
   yarn install
   ```

3. Create a `.env.local` file in the root directory with your Firebase and Twilio credentials:
   ```
   # Firebase Configuration
   NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-auth-domain
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-storage-bucket
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
   NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id

   # Twilio Configuration
   NEXT_PUBLIC_TWILIO_ACCOUNT_SID=your-twilio-account-sid
   NEXT_PUBLIC_TWILIO_API_KEY=your-twilio-api-key
   NEXT_PUBLIC_TWILIO_API_SECRET=your-twilio-api-secret
   ```

4. Run the development server:
   ```
   npm run dev
   # or
   yarn dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## Firebase Setup

1. Create a new Firebase project at [https://console.firebase.google.com/](https://console.firebase.google.com/)
2. Enable Authentication (Email/Password and Google providers)
3. Create a Firestore database
4. Enable Storage
5. Add a web app to your Firebase project and copy the configuration to your `.env.local` file

## Twilio Setup

1. Create a Twilio account at [https://www.twilio.com/](https://www.twilio.com/)
2. Navigate to the Programmable Video section
3. Create an API key and secret
4. Copy the Account SID, API key, and API secret to your `.env.local` file

## Deployment

### Vercel

1. Push your code to a GitHub repository
2. Import the project in Vercel
3. Add your environment variables
4. Deploy

### Firebase Hosting

1. Install Firebase CLI:
   ```
   npm install -g firebase-tools
   ```

2. Login to Firebase:
   ```
   firebase login
   ```

3. Initialize Firebase Hosting:
   ```
   firebase init hosting
   ```

4. Build the project:
   ```
   npm run build
   # or
   yarn build
   ```

5. Deploy to Firebase Hosting:
   ```
   firebase deploy --only hosting
   ```

## License

This project is licensed under the MIT License - see the LICENSE file for details.
