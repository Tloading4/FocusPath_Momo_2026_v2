# Focus Path - Gamified Productivity App

A beautiful, feature-rich focus and productivity application built with React, TypeScript, and Firebase. Focus Path gamifies your productivity journey with XP, levels, streaks, and achievements.

## ✨ Features

### 🎯 Core Focus Features
- **Focus Timer**: Customizable focus sessions (15-60 minutes)
- **Chrome Extension**: Quick timer access from browser toolbar
- **Real-time Sync**: Extension and web app data stay synchronized
- **Distraction Tracking**: Log and analyze distractions during sessions
- **Session Types**: Easy, Medium, Hard, and Extreme focus challenges
- **Real-time Progress**: Visual timer with progress indicators

### 🎮 Gamification
- **XP System**: Earn experience points for completed sessions
- **Levels**: Progress through focus mastery levels
- **Streaks**: Build and maintain daily focus streaks
- **Achievements**: Unlock badges for milestones
- **Leaderboards**: Compete with other focus warriors

### 🛒 Marketplace & Customization
- **XP Marketplace**: Spend earned XP on rewards
- **Custom Avatars**: Personalize your profile
- **Background Themes**: Beautiful environment customization
- **UI Themes**: Color scheme customization
- **Sound Packs**: Ambient sounds for focus sessions

### 🤖 AI-Powered Insights
- **Focus AI Coach**: Personalized productivity advice
- **Pattern Analysis**: Understand your focus habits
- **Predictive Insights**: AI-powered recommendations
- **Enhanced AI Mode**: Advanced analytics (Premium)

### 📊 Analytics & Progress
- **Session History**: Detailed focus session tracking
- **Progress Charts**: Visual progress over time
- **Distraction Analysis**: Identify and reduce distractions
- **Performance Metrics**: Focus score and efficiency tracking

### 👤 Profile & Social
- **User Profiles**: Customizable focus warrior profiles
- **Collections Room**: View achievements and purchases
- **Privacy Controls**: Anonymous mode and data controls
- **Tutorial System**: Guided onboarding experience

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Firebase project (for authentication and database)
- Firebase CLI (for deploying functions)
- Chrome browser (for extension testing)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd focus-path
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Fill in your Firebase configuration in `.env`:
   ```env
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```

4. **Set up Firebase**
   - Create a new Firebase project at [Firebase Console](https://console.firebase.google.com)
   - Enable Authentication with Email/Password
   - Create a Firestore database
   - Update Firebase configuration in `src/firebase.ts`

5. **Configure Stripe for Payments (Required for Premium Features)**
   
   **Get your Stripe keys:**
   - Go to [Stripe Dashboard](https://dashboard.stripe.com)
   - Get your Publishable Key and Secret Key
   - Get your Webhook Secret (after setting up webhooks)
   
   **Set client-side Stripe key:**
   Add to your `.env` file:
   ```env
   VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key
   ```
   
   **Set server-side Stripe keys for Firebase Functions:**
   ```bash
   # Install Firebase CLI if not already installed
   npm install -g firebase-tools
   
   # Login to Firebase
   firebase login
   
   # Set Stripe secret key
   firebase functions:config:set stripe.secret_key="sk_test_your_secret_key"
   
   # Set Stripe webhook secret
   firebase functions:config:set stripe.webhook_secret="whsec_your_webhook_secret"
   
   # Deploy functions with new configuration
   firebase deploy --only functions
   ```
   
   **Set up Stripe Webhooks:**
   - In Stripe Dashboard, go to Webhooks
   - Add endpoint: `https://your-region-your-project.cloudfunctions.net/stripeWebhook/webhook`
   - Select events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`
   - Copy the webhook secret and use it in the Firebase config above

6. **Configure Firestore Security Rules**
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /userProfiles/{userId} {
         allow read: if request.auth != null;
         allow write: if request.auth != null && request.auth.uid == userId;
       }
       
       match /sessions/{sessionId} {
         allow read: if request.auth != null && request.auth.uid == resource.data.userId;
         allow write: if request.auth != null && request.auth.uid == request.resource.data.userId;
       }
       
       match /streaks/{userId} {
         allow read: if request.auth != null;
         allow write: if request.auth != null && request.auth.uid == userId;
       }
       
       match /purchases/{purchaseId} {
         allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
         allow read, update, delete: if request.auth != null && request.auth.uid == resource.data.userId;
       }
     }
   }
   ```

7. **Deploy Firebase Functions**
   ```bash
   firebase deploy --only functions
   ```

8. **Start the development server**
   ```bash
   npm run dev
   ```

9. **Build and test Chrome extension**
   ```bash
   npm run build-extension
   ```
   Then load the `extension` folder as an unpacked extension in Chrome.
## 🏗️ Project Structure

```
src/
├── components/           # React components
│   ├── Auth/            # Authentication components
│   ├── Dashboard/       # Main dashboard components
│   ├── Timer/           # Focus timer components
│   ├── History/         # Session history
│   ├── Marketplace/     # XP marketplace
│   ├── Collections/     # User collections
│   ├── FocusAI/         # AI coach components
│   ├── Monetization/    # Premium features
│   └── ...
├── contexts/            # React contexts
├── hooks/               # Custom React hooks
├── services/            # Extension bridge and sync services
├── firebase.ts          # Firebase configuration
├── stripe-config.ts     # Stripe configuration
└── index.css           # Global styles with animations

Chrome Extension Files:
├── manifest.json        # Extension manifest
├── background.js        # Service worker
├── popup.html          # Extension popup UI
├── popup.js            # Popup logic
├── content.js          # Content script
├── webapp-bridge.js    # Web app integration
└── assets/             # Extension assets
```

## 🎨 Design System

Focus Path uses a comprehensive design system with:
- **Glass morphism UI**: Modern translucent interfaces
- **Gradient themes**: Beautiful color combinations
- **Micro-interactions**: Smooth animations and transitions
- **Responsive design**: Mobile-first approach
- **Dark theme**: Eye-friendly interface

## 🔧 Configuration

### Chrome Extension Setup
1. Build extension files:
   ```bash
   npm run build-extension
   ```
2. Open Chrome and go to `chrome://extensions`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the `extension` folder
5. The Focus Path icon should appear in your browser toolbar

### Extension-Web App Sync
The extension and web application automatically sync data when both are active:
- **Sessions**: Start from extension, view details in web app
- **User Profile**: XP, streaks, and settings sync in real-time
- **Notifications**: Extension shows session status, web app shows detailed analytics

### Firebase Setup
1. Create collections in Firestore:
   - `userProfiles` - User profile data
   - `sessions` - Focus session records
   - `streaks` - User streak data
   - `purchases` - Marketplace purchases

### Stripe Configuration Troubleshooting

If you're getting "internal" errors during checkout:

1. **Verify Firebase Functions Configuration:**
   ```bash
   firebase functions:config:get
   ```
   Should show your stripe configuration.

2. **Check Firebase Functions Logs:**
   ```bash
   firebase functions:log
   ```

3. **Common Issues:**
   - Stripe secret key not set: Use `firebase functions:config:set stripe.secret_key="sk_test_..."`
   - Functions not deployed: Run `firebase deploy --only functions`
   - Wrong Stripe keys: Ensure you're using the correct test/live keys
   - Webhook secret mismatch: Verify webhook secret matches Stripe dashboard

### Optional Integrations

#### Supabase (Advanced Features)
For enhanced features like advanced AI and team collaboration:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 🚀 Deployment

### Build for Production
```bash
npm run build
```

### Deploy to Firebase Hosting
```bash
npm install -g firebase-tools
firebase login
firebase init hosting
firebase deploy
```

### Deploy to Netlify
1. Connect your repository to Netlify
2. Set build command: `npm run build`
3. Set publish directory: `dist`
4. Add environment variables in Netlify dashboard

## 🧪 Testing

The app includes comprehensive error handling and user feedback:
- Form validation
- Network error handling
- Graceful degradation for missing features
- Loading states and error boundaries

## 📱 Features by Tier

### Free Tier
- 5 focus sessions per day
- Basic AI insights
- Standard themes
- Session tracking
- Basic achievements

### Premium Tier
- Unlimited focus sessions
- Enhanced AI coach
- Premium backgrounds
- Advanced analytics
- Data export
- Priority support

### Elite Tier
- Everything in Premium
- Team collaboration
- API access
- White label options
- Personal AI coach
- Dedicated support

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Check the in-app tutorial
- Review the documentation
- Contact support through the app

## 🎯 Roadmap

- [ ] Mobile app (React Native)
- [ ] Team collaboration features
- [ ] Advanced AI insights
- [ ] Integration with productivity tools
- [ ] Offline mode support
- [ ] Advanced analytics dashboard

---

Built with ❤️ for focus warriors everywhere. Start your productivity journey today!