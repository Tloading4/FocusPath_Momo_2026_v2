import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { OverviewScreen } from './components/Overview/OverviewScreen';
import { AuthPage } from './components/Auth/AuthPage';
import { Dashboard } from './components/Dashboard/Dashboard';
import { ProfileSetup } from './components/Profile/ProfileSetup';
import { SuccessPage } from './components/Monetization/SuccessPage';
import { CancelPage } from './components/Monetization/CancelPage';
import { UsernameMigrationModal } from './components/Auth/UsernameMigrationModal';
import { useAuth } from './contexts/AuthContext';
import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';

function AppContent() {
  const { currentUser } = useAuth();
  const [profileCompleted, setProfileCompleted] = useState<boolean | null>(null);
  const [showOverview, setShowOverview] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkProfile = async () => {
      if (currentUser) {
        try {
          setError(null);
          const userProfileDoc = await getDoc(doc(db, 'userProfiles', currentUser.uid));
          if (userProfileDoc.exists()) {
            const profileData = userProfileDoc.data();
            setProfileCompleted(profileData.profileCompleted || false);
          } else {
            setProfileCompleted(false);
          }
        } catch (error) {
          console.error('Error checking profile:', error);
          setError('Failed to load profile data');
          setProfileCompleted(false);
        }
      } else {
        setProfileCompleted(null);
        setError(null);
      }
      setLoading(false);
    };

    checkProfile();
  }, [currentUser]);

  const handleProfileComplete = () => {
    setProfileCompleted(true);
    setError(null);
  };

  const handleGetStarted = () => {
    setShowOverview(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen theme-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-white text-xl">Loading Focus Path™...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen theme-bg flex items-center justify-center p-4">
        <div className="glass-card rounded-2xl p-8 text-center border border-white/20">
          <div className="text-red-400 text-4xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-white mb-4">Connection Error</h2>
          <p className="text-gray-300 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 px-6 py-3 rounded-xl transition-all"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <>
      <Routes>
        {/* Default route */}
        <Route path="/" element={
          showOverview ? (
            <OverviewScreen onGetStarted={handleGetStarted} />
          ) : currentUser ? (
            profileCompleted === false ? (
              <ProfileSetup onComplete={handleProfileComplete} />
            ) : (
              <Dashboard profileCompleted={profileCompleted === null ? undefined : profileCompleted} />
            )
          ) : (
            <AuthPage onBackToOverview={() => setShowOverview(true)} />
          )
        } />

        {/* Auth route for direct access */}
        <Route path="/auth" element={
          showOverview ? (
            <OverviewScreen onGetStarted={handleGetStarted} />
          ) : currentUser ? (
            profileCompleted === false ? (
              <ProfileSetup onComplete={handleProfileComplete} />
            ) : (
              <Dashboard profileCompleted={profileCompleted === null ? undefined : profileCompleted} />
            )
          ) : (
            <AuthPage onBackToOverview={() => setShowOverview(true)} />
          )
        } />

        {/* Public routes */}
        <Route path="/success" element={<SuccessPage />} />
        <Route path="/cancel" element={<CancelPage />} />

        {/* Catch all - redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {currentUser && profileCompleted && <UsernameMigrationModal />}
    </>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

export default App;