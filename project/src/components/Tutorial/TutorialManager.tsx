import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { TutorialOverlay } from './TutorialOverlay';
import { HelpCircle, Play } from 'lucide-react';

interface TutorialManagerProps {
  children: React.ReactNode;
}

export function TutorialManager({ children }: TutorialManagerProps) {
  const [showTutorial, setShowTutorial] = useState(false);
  const [hasCompletedTutorial, setHasCompletedTutorial] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showTutorialButton, setShowTutorialButton] = useState(false);
  const { currentUser } = useAuth();

  useEffect(() => {
    checkTutorialStatus();
  }, [currentUser]);

  const checkTutorialStatus = async () => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    try {
      const userProfileDoc = await getDoc(doc(db, 'userProfiles', currentUser.uid));
      
      if (userProfileDoc.exists()) {
        const profileData = userProfileDoc.data();
        const completed = profileData.tutorialCompleted || false;
        setHasCompletedTutorial(completed);
        
        // Show tutorial automatically for new users
        if (!completed) {
          // Wait a bit for the dashboard to load, then show tutorial
          setTimeout(() => {
            setShowTutorial(true);
          }, 1500);
        } else {
          // Show tutorial button for users who have completed it
          setShowTutorialButton(true);
        }
      } else {
        // New user - show tutorial
        setHasCompletedTutorial(false);
        setTimeout(() => {
          setShowTutorial(true);
        }, 1500);
      }
    } catch (error) {
      console.error('Error checking tutorial status:', error);
      // Default to showing tutorial for safety
      setTimeout(() => {
        setShowTutorial(true);
      }, 1500);
    } finally {
      setLoading(false);
    }
  };

  const handleTutorialComplete = async () => {
    if (!currentUser) return;

    try {
      // Mark tutorial as completed in user profile
      await setDoc(
        doc(db, 'userProfiles', currentUser.uid),
        {
          tutorialCompleted: true,
          tutorialCompletedAt: new Date(),
          lastUpdated: new Date()
        },
        { merge: true }
      );

      setHasCompletedTutorial(true);
      setShowTutorialButton(true);
      setShowTutorial(false);
    } catch (error) {
      console.error('Error marking tutorial as completed:', error);
    }
  };

  const handleRestartTutorial = () => {
    setShowTutorial(true);
  };

  return (
    <>
      {children}
      
      {/* Tutorial Button for returning users */}
      {showTutorialButton && hasCompletedTutorial && (
        <button
          onClick={handleRestartTutorial}
          className="fixed bottom-4 left-4 bg-gradient-to-r from-violet-600 to-indigo-600 text-white p-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 z-40 group"
          title="Restart Tutorial"
        >
          <HelpCircle className="h-6 w-6 group-hover:rotate-12 transition-transform" />
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 bg-black/80 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            Tutorial
          </div>
        </button>
      )}

      {/* Welcome Tutorial Button for new users (if tutorial is not auto-showing) */}
      {!hasCompletedTutorial && !showTutorial && !loading && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card rounded-2xl p-8 border border-white/20 text-center max-w-md">
            <div className="text-6xl mb-4">🎯</div>
            <h2 className="text-2xl font-bold text-white mb-4">Welcome to Focus Path™!</h2>
            <p className="text-gray-300 mb-6">
              Would you like to take a quick tutorial to learn how to use Focus Path™ effectively?
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setShowTutorial(false);
                  setShowTutorialButton(true);
                  handleTutorialComplete();
                }}
                className="flex-1 bg-gray-500/20 hover:bg-gray-500/30 text-gray-300 px-4 py-3 rounded-xl transition-all"
              >
                Skip for Now
              </button>
              <button
                onClick={() => setShowTutorial(true)}
                className="flex-1 bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-4 py-3 rounded-xl hover:from-violet-700 hover:to-indigo-700 transition-all transform hover:scale-105 flex items-center justify-center gap-2"
              >
                <Play className="h-4 w-4" />
                Start Tutorial
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tutorial Overlay */}
      <TutorialOverlay
        isOpen={showTutorial}
        onClose={() => setShowTutorial(false)}
        onComplete={handleTutorialComplete}
      />
    </>
  );
}