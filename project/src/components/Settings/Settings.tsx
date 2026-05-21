import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSubscription } from '../../hooks/useSubscription';
import { doc, getDoc, setDoc, collection, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { PremiumUpgrade } from '../Monetization/PremiumUpgrade';
import {
  Settings as SettingsIcon,
  User,
  Palette,
  Shield,
  Download,
  Trash2,
  Save,
  Eye,
  EyeOff,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Crown,
  Mail,
  MessageCircle,
  ExternalLink,
  Star,
  Volume2,
  Play,
  Bot
} from 'lucide-react';
import { getRemainingMessages } from '../../services/claudeAIService';
import { soundService, SOUND_OPTIONS, SoundType } from '../../services/soundService';
import { notificationService } from '../../services/notificationService';
import { NotificationService } from '../../services/NotificationDataService';
import { UsernameChanger } from './UsernameChanger';

interface UserSettings {
  displayName: string;
  isAnonymous: boolean;
  notifications: {
    sessionReminders: boolean;
    streakAlerts: boolean;
    achievementNotifications: boolean;
    weeklyReports: boolean;
  };
  preferences: {
    defaultSessionType: string;
    autoStartBreaks: boolean;
    language: string;
    soundEnabled?: boolean;
    soundType?: SoundType;
    soundVolume?: number;
    notificationsEnabled?: boolean;
    repeatingSoundEnabled?: boolean;
    repeatingSoundInterval?: number;
    tabFlashEnabled?: boolean;
    enableXPAnimations?: boolean;
    enableLevelUpOverlays?: boolean;
    showSmallXPGains?: boolean;
  };
  privacy: {
    showInLeaderboard: boolean;
    shareStats: boolean;
    dataCollection: boolean;
  };
}

const defaultSettings: UserSettings = {
  displayName: '',
  isAnonymous: false,
  notifications: {
    sessionReminders: true,
    streakAlerts: true,
    achievementNotifications: true,
    weeklyReports: false,
  },
  preferences: {
    defaultSessionType: 'medium',
    autoStartBreaks: false,
    language: 'en',
    soundEnabled: true,
    soundType: 'classic-beep',
    soundVolume: 0.5,
    notificationsEnabled: true,
    repeatingSoundEnabled: false,
    repeatingSoundInterval: 30,
    tabFlashEnabled: true,
    enableXPAnimations: true,
    enableLevelUpOverlays: true,
    showSmallXPGains: true,
  },
  privacy: {
    showInLeaderboard: true,
    shareStats: true,
    dataCollection: true,
  },
};

// Active Background Widget Component
function ActiveBackgroundWidget() {
  const [activeBackground, setActiveBackground] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { currentUser } = useAuth();

  // Background themes mapping
  const backgroundThemes = {
    'bg_mountain_peaks': 'Mountain Peaks',
    'bg_ocean_waves': 'Ocean Waves',
    'bg_forest_path': 'Forest Path',
    'bg_desert_dunes': 'Desert Dunes',
    'bg_northern_lights': 'Northern Lights',
    'bg_cherry_blossoms': 'Cherry Blossoms',
    'bg_city_skyline': 'City Skyline',
    'bg_lavender_fields': 'Lavender Fields'
  };

  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    const userProfileRef = doc(db, 'userProfiles', currentUser.uid);

    const unsubscribe = onSnapshot(userProfileRef, async (docSnap) => {
      try {
        if (docSnap.exists()) {
          const profileData = docSnap.data();

          if (profileData.activeBackground) {
            setActiveBackground(profileData.activeBackground);
            setLoading(false);
            return;
          }
        }

        // If no active background in profile, check user's purchases subcollection
        const purchasesQuery = collection(db, 'userProfiles', currentUser.uid, 'purchases');
        const purchasesSnapshot = await getDocs(purchasesQuery);

        // Find the most recent background purchase
        let latestBackground = null;
        let latestDate: Date | null = null;

        purchasesSnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.category === 'background') {
            const purchaseDate = data.datePurchased.toDate();

            if (!latestDate || purchaseDate > latestDate) {
              latestDate = purchaseDate;
              latestBackground = data.itemId;
            }
          }
        });

        setActiveBackground(latestBackground);
      } catch (error) {
        console.error('Error fetching active background:', error);
        setActiveBackground(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [currentUser]);

  if (loading) {
    return (
      <div className="rounded-lg p-4 animate-pulse">
        <div className="h-4 bg-white/20 rounded mb-2"></div>
        <div className="h-3 bg-white/20 rounded"></div>
      </div>
    );
  }

  if (!activeBackground) {
    return (
      <div className="rounded-lg p-4">
        <div className="flex items-center gap-3">
          <div className="text-2xl">🎨</div>
          <div>
            <h4 className="font-semibold text-white">Background Theme</h4>
            <p className="text-sm text-gray-300">Using default background</p>
          </div>
        </div>
      </div>
    );
  }

  const backgroundName = backgroundThemes[activeBackground as keyof typeof backgroundThemes] || 'Custom Background';

  return (
    <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-lg p-4">
      <div className="flex items-center gap-3">
        <div className="text-2xl">🎨</div>
        <div>
          <h4 className="font-semibold text-white">Active Background</h4>
          <p className="text-sm text-purple-200">{backgroundName}</p>
        </div>
      </div>
      <p className="text-xs text-purple-300 mt-2">
        Visit the Marketplace to purchase and equip new backgrounds
      </p>
    </div>
  );
}

interface SettingsProps {
  onSettingsChange?: () => void;
}

export function Settings({ onSettingsChange }: SettingsProps) {
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [originalSettings, setOriginalSettings] = useState<UserSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('profile');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const { currentUser, logout } = useAuth();
  const { subscription } = useSubscription();

  // Check for unsaved changes
  useEffect(() => {
    const hasChanges = JSON.stringify(settings) !== JSON.stringify(originalSettings);
    setHasUnsavedChanges(hasChanges);
  }, [settings, originalSettings]);

  useEffect(() => {
    const fetchSettings = async () => {
      if (!currentUser) {
        setLoading(false);
        return;
      }

      try {
        setError(null);
        const userProfileDoc = await getDoc(doc(db, 'userProfiles', currentUser.uid));
        
        let loadedSettings = { ...defaultSettings };
        
        if (userProfileDoc.exists()) {
          const profileData = userProfileDoc.data();
          loadedSettings = {
            displayName: profileData.displayName || '',
            isAnonymous: profileData.isAnonymous || false,
            notifications: {
              ...defaultSettings.notifications,
              ...profileData.settings?.notifications,
            },
            preferences: {
              ...defaultSettings.preferences,
              ...profileData.settings?.preferences,
            },
            privacy: {
              ...defaultSettings.privacy,
              ...profileData.settings?.privacy,
            },
          };
        } else {
          // Keep display name empty for new users
          loadedSettings.displayName = '';
        }
        
        setSettings(loadedSettings);
        setOriginalSettings(loadedSettings);
      } catch (error) {
        console.error('Error fetching settings:', error);
        setError('Failed to load settings. Please refresh the page.');
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [currentUser]);

  const validateSettings = (): string | null => {
    if (!settings.displayName.trim()) {
      return 'Display name is required';
    }
    
    if (settings.displayName.length > 30) {
      return 'Display name must be 30 characters or less';
    }
    
    if (settings.displayName.trim().length < 2) {
      return 'Display name must be at least 2 characters';
    }
    
    return null;
  };

  const handleSave = async () => {
    if (!currentUser) return;

    const validationError = validateSettings();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const userProfileRef = doc(db, 'userProfiles', currentUser.uid);
      
      // Get current profile data to preserve other fields
      const currentProfile = await getDoc(userProfileRef);
      const currentData = currentProfile.exists() ? currentProfile.data() : {};
      
      const updatedData = {
        ...currentData,
        displayName: settings.displayName.trim(),
        isAnonymous: settings.isAnonymous,
        settings: {
          notifications: settings.notifications,
          preferences: settings.preferences,
          privacy: settings.privacy,
        },
        lastUpdated: new Date(),
      };

      await setDoc(userProfileRef, updatedData, { merge: true });

      await NotificationService.updatePreferences({
        enable_xp_animations: settings.preferences.enableXPAnimations ?? true,
        enable_levelup_overlays: settings.preferences.enableLevelUpOverlays ?? true,
        enable_notification_sounds: settings.preferences.soundEnabled ?? true,
        show_small_xp_gains: settings.preferences.showSmallXPGains ?? true
      });

      // Update original settings to reflect saved state
      setOriginalSettings({ ...settings });
      setSuccess('Settings saved successfully!');

      // Notify parent component about settings change
      if (onSettingsChange) {
        onSettingsChange();
      }

      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      setError('Failed to save settings. Please check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm('Are you sure you want to discard your changes?');
      if (confirmed) {
        setSettings({ ...originalSettings });
        setError(null);
      }
    }
  };

  const handleExportData = async () => {
    if (!currentUser) return;

    try {
      setError(null);
      
      // Fetch all user data for export
      const userProfileDoc = await getDoc(doc(db, 'userProfiles', currentUser.uid));
      
      const exportData = {
        profile: userProfileDoc.exists() ? userProfileDoc.data() : {},
        settings: settings,
        subscription: subscription,
        exportDate: new Date().toISOString(),
        userId: currentUser.uid,
        email: currentUser.email,
        version: '1.0',
      };

      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `focus-path-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setSuccess('Data exported successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Error exporting data:', error);
      setError('Failed to export data. Please try again.');
    }
  };

  const handleDeleteAccount = async () => {
    if (!currentUser) return;

    const confirmed = window.confirm(
      '⚠️ WARNING: This will permanently delete your account and ALL your data including:\n\n' +
      '• All focus sessions and progress\n' +
      '• XP and achievements\n' +
      '• Streaks and statistics\n' +
      '• Profile and settings\n\n' +
      'This action CANNOT be undone. Are you absolutely sure?'
    );

    if (!confirmed) return;

    const doubleConfirm = window.prompt(
      'To confirm account deletion, please type "DELETE MY ACCOUNT" exactly:'
    );

    if (doubleConfirm !== 'DELETE MY ACCOUNT') {
      alert('Account deletion cancelled - text did not match exactly.');
      return;
    }

    try {
      // In a production app, you would call a cloud function to:
      // 1. Delete all user documents from Firestore
      // 2. Delete the user's authentication account
      // 3. Clean up any other associated data
      
      // For this demo, we'll simulate the process
      setSuccess('Account deletion initiated. You will be logged out shortly...');
      
      setTimeout(async () => {
        try {
          await logout();
        } catch (logoutError) {
          console.error('Error during logout:', logoutError);
          // Force reload if logout fails
          window.location.reload();
        }
      }, 2000);
      
    } catch (error) {
      console.error('Error initiating account deletion:', error);
      setError('Failed to delete account. Please contact support.');
    }
  };

  const handleContactSupport = () => {
    const subject = encodeURIComponent('Focus Path™ Support Request');
    const body = encodeURIComponent(`Hello Focus Path™ Support Team,

I need assistance with:

[Please describe your issue here]

User Details:
- Email: ${currentUser?.email || 'Not available'}
- Subscription: ${subscription?.tier || 'Free'}

Thank you for your help!`);
    
    window.open(`mailto:hemisphirtechnologies@gmail.com?subject=${subject}&body=${body}`, '_blank');
  };

  const [aiUsage, setAiUsage] = useState<{ used: number; limit: number; remaining: number; isPremium: boolean } | null>(null);
  const [aiUsageLoading, setAiUsageLoading] = useState(false);

  const loadAiUsage = async () => {
    if (!currentUser) return;
    setAiUsageLoading(true);
    try {
      const data = await getRemainingMessages();
      setAiUsage(data);
    } catch {
      // Cloud Functions may not be deployed yet
      setAiUsage(null);
    } finally {
      setAiUsageLoading(false);
    }
  };

  const tabs = [
    { id: 'profile', name: 'Profile', icon: User },
    { id: 'subscription', name: 'Subscription', icon: Crown },
    { id: 'preferences', name: 'Preferences', icon: Palette },
    { id: 'sound', name: 'Sound', icon: Volume2 },
    { id: 'ai', name: 'AI', icon: Bot },
    { id: 'privacy', name: 'Privacy', icon: Shield },
    { id: 'data', name: 'Data', icon: Download },
    { id: 'support', name: 'Support', icon: MessageCircle },
  ];

  if (loading) {
    return (
      <div className="glass-card rounded-xl sm:rounded-2xl p-4 sm:p-8 shadow-2xl border border-white/20">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-white/20 rounded"></div>
          <div className="h-4 bg-white/20 rounded"></div>
          <div className="h-4 bg-white/20 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="glass-card rounded-xl sm:rounded-2xl p-4 sm:p-8 shadow-2xl border border-white/20">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-r from-violet-600 to-indigo-600 p-3 rounded-2xl">
              <SettingsIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white">Settings</h2>
              <p className="text-sm sm:text-base text-gray-300">Customize your Focus Path™ experience</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Subscription Status */}
            {subscription && (
              <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2">
                {subscription.tier === 'standard' ? (
                  <Crown className="h-4 w-4 text-gray-400" />
                ) : (
                  <Crown className="h-4 w-4 text-purple-400" />
                )}
                <span className="text-white text-sm capitalize">{subscription.tier}</span>
              </div>
            )}

            {hasUnsavedChanges && (
              <button
                onClick={handleReset}
                className="flex items-center gap-2 bg-gray-500/20 hover:bg-gray-500/30 text-gray-300 px-3 sm:px-4 py-2 rounded-lg transition-all text-sm"
              >
                <RefreshCw className="h-4 w-4" />
                <span className="hidden sm:inline">Reset</span>
              </button>
            )}
            
            <button
              onClick={handleSave}
              disabled={saving || !hasUnsavedChanges}
              className={`flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 rounded-xl font-semibold transition-all transform hover:scale-105 text-sm sm:text-base ${
                hasUnsavedChanges
                  ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700'
                  : 'bg-gray-500/20 text-gray-400 cursor-not-allowed'
              } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : hasUnsavedChanges ? 'Save Changes' : 'No Changes'}
            </button>
          </div>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 mb-4 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
            <span className="text-red-300 text-sm sm:text-base">{error}</span>
            <button 
              onClick={() => setError(null)}
              className="ml-auto text-red-400 hover:text-red-300"
            >
              ×
            </button>
          </div>
        )}

        {success && (
          <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-3 mb-4 flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
            <span className="text-green-300 text-sm sm:text-base">{success}</span>
            <button 
              onClick={() => setSuccess(null)}
              className="ml-auto text-green-400 hover:text-green-300"
            >
              ×
            </button>
          </div>
        )}

        {hasUnsavedChanges && (
          <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-3 mb-4 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-400 flex-shrink-0" />
            <span className="text-yellow-300 text-sm sm:text-base">You have unsaved changes</span>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex rounded-lg p-1 overflow-x-auto">
          {tabs.map((tab) => {
            const IconComponent = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 rounded-md transition-all flex-1 justify-center whitespace-nowrap text-xs sm:text-sm ${
                  activeTab === tab.id
                    ? 'bg-blue-500/30 text-blue-300'
                    : 'text-gray-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <IconComponent className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Settings Content */}
      <div className="glass-card rounded-xl sm:rounded-2xl p-4 sm:p-8 shadow-2xl border border-white/20">
        {activeTab === 'profile' && (
          <div className="space-y-6">
            <h3 className="text-lg sm:text-xl font-bold text-white mb-4">Profile Settings</h3>

            <UsernameChanger
              currentUsername={settings.displayName}
              onUsernameChanged={(newUsername) => {
                setSettings(prev => ({ ...prev, displayName: newUsername }));
                setOriginalSettings(prev => ({ ...prev, displayName: newUsername }));
              }}
            />

            <div className="flex items-center justify-between p-4 rounded-lg">
              <div>
                <h4 className="font-semibold text-white">Anonymous Mode</h4>
                <p className="text-sm text-gray-300">Hide your name on leaderboards and public areas</p>
              </div>
              <button
                onClick={() => setSettings(prev => ({ ...prev, isAnonymous: !prev.isAnonymous }))}
                className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg transition-all text-sm ${
                  settings.isAnonymous
                    ? 'bg-gray-500/20 text-gray-300'
                    : 'bg-blue-500/20 text-blue-300'
                }`}
              >
                {settings.isAnonymous ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {settings.isAnonymous ? 'Anonymous' : 'Public'}
              </button>
            </div>

            {/* Active Background Widget */}
            <ActiveBackgroundWidget />

            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <h4 className="font-semibold text-blue-300 mb-2">Profile Tips</h4>
              <ul className="text-sm text-blue-200 space-y-1">
                <li>• Your display name appears on leaderboards and achievements</li>
                <li>• Anonymous mode hides your name but keeps your progress</li>
                <li>• You can change these settings anytime</li>
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'subscription' && (
          <div className="space-y-6">
            <h3 className="text-lg sm:text-xl font-bold text-white mb-4">Subscription</h3>

            {/* Beta Access Notice */}
            <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <Star className="h-8 w-8 text-green-400" />
                <div>
                  <h4 className="text-2xl font-bold text-white">All Premium Features Unlocked!</h4>
                  <p className="text-green-200">Beta Access - No Payment Required</p>
                </div>
              </div>
              <p className="text-green-200 mb-4">
                You currently have free access to all premium features during our beta period. Enjoy unlimited sessions, AI coaching, mini-games, and more!
              </p>
            </div>

            {/* Current Features */}
            <div className="bg-white/10 rounded-xl p-6">
              <h4 className="text-xl font-bold text-white mb-4">Your Active Features</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                  <span className="text-gray-300">Unlimited focus sessions</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                  <span className="text-gray-300">Unlimited AI coaching</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                  <span className="text-gray-300">All mini-games unlocked</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                  <span className="text-gray-300">Dashboard customization</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                  <span className="text-gray-300">50+ premium backgrounds</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                  <span className="text-gray-300">Unlimited data exports</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                  <span className="text-gray-300">Custom photo avatars</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                  <span className="text-gray-300">All power-ups unlocked</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                  <span className="text-gray-300">Full session history</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                  <span className="text-gray-300">Advanced analytics</span>
                </div>
              </div>
            </div>

            {/* Coming Soon Notice */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <Crown className="h-6 w-6 text-blue-400" />
                <h4 className="text-xl font-bold text-white">Premium Upgrade Coming Soon</h4>
              </div>
              <p className="text-blue-200 mb-4">
                We're working on premium subscription plans that will offer additional benefits. In the meantime, continue enjoying all features at no cost.
              </p>
              <div className="bg-blue-500/20 rounded-lg p-4">
                <p className="text-blue-200 text-sm">
                  <strong>What to expect:</strong> We'll notify you well in advance before making any changes to pricing or feature access. Your data and progress will always be preserved.
                </p>
              </div>
            </div>

            {/* FAQ */}
            <div className="bg-white/10 rounded-xl p-6">
              <h4 className="text-xl font-bold text-white mb-4">Frequently Asked Questions</h4>
              <div className="space-y-4">
                <div>
                  <h5 className="font-semibold text-white mb-2">Will I lose access to features?</h5>
                  <p className="text-gray-300 text-sm">
                    No. We'll notify you before any changes, and you'll have options to maintain access to features you've been using.
                  </p>
                </div>
                <div>
                  <h5 className="font-semibold text-white mb-2">When will premium plans launch?</h5>
                  <p className="text-gray-300 text-sm">
                    We're currently in beta and gathering feedback. Premium plans will be announced with advance notice to all users.
                  </p>
                </div>
                <div>
                  <h5 className="font-semibold text-white mb-2">Will my data be safe?</h5>
                  <p className="text-gray-300 text-sm">
                    Absolutely. Your session history, XP, achievements, and all data will be preserved regardless of any future subscription changes.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'ai' && (
          <div className="space-y-6">
            <h3 className="text-lg sm:text-xl font-bold text-white mb-4">Momo AI</h3>

            {/* Status card */}
            <div className="bg-violet-500/10 border border-violet-500/30 rounded-xl p-5">
              <div className="flex items-start gap-3 mb-4">
                <div className="bg-violet-500/20 p-2 rounded-lg flex-shrink-0">
                  <Bot className="h-5 w-5 text-violet-300" />
                </div>
                <div>
                  <h4 className="font-semibold text-white mb-1">Powered by Claude AI</h4>
                  <p className="text-sm text-gray-300">
                    Momo is ready to use — no setup required. Your AI key is kept securely on our server, never shared with users.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-2">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-sm text-green-300 font-medium">All AI features active</span>
              </div>
            </div>

            {/* Daily usage */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-white">Today's Usage</h4>
                <button
                  onClick={loadAiUsage}
                  disabled={aiUsageLoading}
                  className="text-xs text-violet-400 hover:text-violet-300 transition-colors flex items-center gap-1"
                >
                  <RefreshCw className={`h-3 w-3 ${aiUsageLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>

              {aiUsage ? (
                <>
                  <div className="flex items-end justify-between mb-2">
                    <span className="text-2xl font-bold text-white">{aiUsage.used}</span>
                    <span className="text-sm text-gray-400">/ {aiUsage.limit} messages</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2 mb-2">
                    <div
                      className="bg-gradient-to-r from-violet-500 to-indigo-500 h-2 rounded-full transition-all"
                      style={{ width: `${Math.min(100, (aiUsage.used / aiUsage.limit) * 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-400">
                    {aiUsage.remaining} messages remaining today
                    {aiUsage.isPremium ? ' · Premium plan' : ' · Free plan'}
                  </p>
                  {!aiUsage.isPremium && (
                    <p className="text-xs text-violet-400 mt-2">
                      Upgrade to premium for 10× more daily messages (500/day)
                    </p>
                  )}
                </>
              ) : (
                <button
                  onClick={loadAiUsage}
                  className="w-full py-3 text-sm text-gray-400 hover:text-white border border-white/10 hover:border-white/20 rounded-lg transition-all"
                >
                  {aiUsageLoading ? 'Loading...' : 'Check usage'}
                </button>
              )}
            </div>

            {/* Feature list */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <h4 className="font-semibold text-white mb-3">Included AI features</h4>
              <ul className="space-y-2 text-sm text-gray-300">
                {[
                  'Momo chat — personalized AI coaching',
                  'Pre-session focus tips',
                  'Post-session reflections & next steps',
                  'AI Study Buddy (live session support)',
                  'Personalized insights dashboard',
                  'Weekly progress report',
                ].map((feature) => (
                  <li key={feature} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'sound' && (
          <div className="space-y-6">
            <h3 className="text-lg sm:text-xl font-bold text-white mb-4">Sound & Notifications</h3>

            <div className="flex items-center justify-between p-4 rounded-lg">
              <div>
                <h4 className="font-semibold text-white">Enable Sounds</h4>
                <p className="text-sm text-gray-300">Play sound when focus sessions complete</p>
              </div>
              <button
                onClick={() => setSettings(prev => ({
                  ...prev,
                  preferences: { ...prev.preferences, soundEnabled: !prev.preferences.soundEnabled }
                }))}
                className={`w-12 h-6 rounded-full transition-all relative ${
                  settings.preferences.soundEnabled ? 'bg-blue-500' : 'bg-gray-600'
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full transition-transform absolute top-0.5 ${
                  settings.preferences.soundEnabled ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>

            {settings.preferences.soundEnabled && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">
                    Alert Sound
                  </label>
                  <div className="grid grid-cols-1 gap-3">
                    {SOUND_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setSettings(prev => ({
                          ...prev,
                          preferences: { ...prev.preferences, soundType: option.value }
                        }))}
                        className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all ${
                          settings.preferences.soundType === option.value
                            ? 'border-blue-500 bg-blue-500/20'
                            : 'border-white/20 bg-white/5 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <span className="text-2xl">{option.emoji}</span>
                          <div className="text-left">
                            <div className="font-semibold text-white">{option.label}</div>
                            <div className="text-sm text-gray-300">{option.description}</div>
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            soundService.playSound(option.value, settings.preferences.soundVolume || 0.5);
                          }}
                          className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 px-3 py-2 rounded-lg transition-all flex items-center gap-2 text-sm"
                        >
                          <Play className="h-4 w-4" />
                          Preview
                        </button>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">
                    Volume: {Math.round((settings.preferences.soundVolume || 0.5) * 100)}%
                  </label>
                  <div className="flex items-center gap-4">
                    <Volume2 className="h-5 w-5 text-gray-400" />
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={settings.preferences.soundVolume || 0.5}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        preferences: { ...prev.preferences, soundVolume: parseFloat(e.target.value) }
                      }))}
                      className="flex-1 h-2 bg-white/20 rounded-lg appearance-none cursor-pointer"
                      style={{
                        background: `linear-gradient(to right, rgb(59, 130, 246) 0%, rgb(59, 130, 246) ${(settings.preferences.soundVolume || 0.5) * 100}%, rgba(255,255,255,0.2) ${(settings.preferences.soundVolume || 0.5) * 100}%, rgba(255,255,255,0.2) 100%)`
                      }}
                    />
                    <button
                      onClick={() => soundService.playSound(
                        settings.preferences.soundType || 'classic-beep',
                        settings.preferences.soundVolume || 0.5
                      )}
                      className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 px-4 py-2 rounded-lg transition-all flex items-center gap-2"
                    >
                      <Play className="h-4 w-4" />
                      Test
                    </button>
                  </div>
                </div>

                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-300 mb-2">Sound Tips</h4>
                  <ul className="text-sm text-blue-200 space-y-1">
                    <li>• Choose a sound that motivates you without being jarring</li>
                    <li>• Test different sounds to find what works best for your environment</li>
                    <li>• Adjust volume based on your workspace noise level</li>
                    <li>• Sounds play when your focus session completes</li>
                  </ul>
                </div>
              </>
            )}

            <div className="border-t border-white/10 pt-6 mt-6">
              <h3 className="text-lg sm:text-xl font-bold text-white mb-4">Timer Completion Alerts</h3>

              <div className="flex items-center justify-between p-4 rounded-lg mb-4">
                <div>
                  <h4 className="font-semibold text-white">Browser Notifications</h4>
                  <p className="text-sm text-gray-300">Show a notification when timer completes (even in other tabs)</p>
                </div>
                <button
                  onClick={async () => {
                    const newValue = !settings.preferences.notificationsEnabled;
                    if (newValue) {
                      const granted = await notificationService.requestPermission();
                      if (!granted) {
                        alert('Please allow notifications in your browser settings to use this feature.');
                        return;
                      }
                    }
                    setSettings(prev => ({
                      ...prev,
                      preferences: { ...prev.preferences, notificationsEnabled: newValue }
                    }));
                  }}
                  className={`w-12 h-6 rounded-full transition-all relative ${
                    settings.preferences.notificationsEnabled ? 'bg-blue-500' : 'bg-gray-600'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform absolute top-0.5 ${
                    settings.preferences.notificationsEnabled ? 'translate-x-6' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg mb-4">
                <div>
                  <h4 className="font-semibold text-white">Tab Title Flashing</h4>
                  <p className="text-sm text-gray-300">Flash the browser tab title to grab your attention</p>
                </div>
                <button
                  onClick={() => setSettings(prev => ({
                    ...prev,
                    preferences: { ...prev.preferences, tabFlashEnabled: !prev.preferences.tabFlashEnabled }
                  }))}
                  className={`w-12 h-6 rounded-full transition-all relative ${
                    settings.preferences.tabFlashEnabled ? 'bg-blue-500' : 'bg-gray-600'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform absolute top-0.5 ${
                    settings.preferences.tabFlashEnabled ? 'translate-x-6' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>

              {settings.preferences.soundEnabled && (
                <>
                  <div className="flex items-center justify-between p-4 rounded-lg mb-4">
                    <div>
                      <h4 className="font-semibold text-white">Repeating Sound Alert</h4>
                      <p className="text-sm text-gray-300">Play alert sound repeatedly until you acknowledge</p>
                    </div>
                    <button
                      onClick={() => setSettings(prev => ({
                        ...prev,
                        preferences: { ...prev.preferences, repeatingSoundEnabled: !prev.preferences.repeatingSoundEnabled }
                      }))}
                      className={`w-12 h-6 rounded-full transition-all relative ${
                        settings.preferences.repeatingSoundEnabled ? 'bg-blue-500' : 'bg-gray-600'
                      }`}
                    >
                      <div className={`w-5 h-5 bg-white rounded-full transition-transform absolute top-0.5 ${
                        settings.preferences.repeatingSoundEnabled ? 'translate-x-6' : 'translate-x-0.5'
                      }`} />
                    </button>
                  </div>

                  {settings.preferences.repeatingSoundEnabled && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-300 mb-3">
                        Repeat Interval: {settings.preferences.repeatingSoundInterval || 30} seconds
                      </label>
                      <input
                        type="range"
                        min="10"
                        max="60"
                        step="10"
                        value={settings.preferences.repeatingSoundInterval || 30}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          preferences: { ...prev.preferences, repeatingSoundInterval: parseInt(e.target.value) }
                        }))}
                        className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer"
                        style={{
                          background: `linear-gradient(to right, rgb(59, 130, 246) 0%, rgb(59, 130, 246) ${((settings.preferences.repeatingSoundInterval || 30) - 10) / 50 * 100}%, rgba(255,255,255,0.2) ${((settings.preferences.repeatingSoundInterval || 30) - 10) / 50 * 100}%, rgba(255,255,255,0.2) 100%)`
                        }}
                      />
                      <div className="flex justify-between text-xs text-gray-400 mt-1">
                        <span>10s</span>
                        <span>30s</span>
                        <span>60s</span>
                      </div>
                    </div>
                  )}
                </>
              )}

              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                <h4 className="font-semibold text-yellow-300 mb-2 flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Why Multiple Alerts?
                </h4>
                <p className="text-sm text-yellow-200">
                  When working in other tabs, it's easy to miss timer completion. These alerts ensure you never miss a completed session, even when deeply focused on homework or other tasks!
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'preferences' && (
          <div className="space-y-6">
            <h3 className="text-lg sm:text-xl font-bold text-white mb-4">App Preferences</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Default Session Type</label>
              <select
                value={settings.preferences.defaultSessionType}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  preferences: { ...prev.preferences, defaultSessionType: e.target.value }
                }))}
              className="w-full px-4 py-3 bg-transparent border border-white/20 rounded-lg text-white focus:text-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"

              >
                <option value="easy">Easy Focus (15 min) - 50 XP</option>
                <option value="medium">Medium Focus (30 min) - 100 XP</option>
                <option value="hard">Hard Focus (45 min) - 150 XP</option>
                <option value="extreme">Extreme Focus (60 min) - 200 XP</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Language</label>
              <select
                value={settings.preferences.language}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  preferences: { ...prev.preferences, language: e.target.value }
                }))}
            className="w-full px-4 py-3 bg-transparent border border-white/20 rounded-lg text-white focus:text-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              >
                <option value="en">English</option>
                <option value="es">Español (Coming Soon)</option>
                <option value="fr">Français (Coming Soon)</option>
                <option value="de">Deutsch (Coming Soon)</option>
              </select>
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg">
              <div>
                <h4 className="font-semibold text-white">Auto-start Breaks</h4>
                <p className="text-sm text-gray-300">Automatically start break timers after completing focus sessions</p>
              </div>
              <button
                onClick={() => setSettings(prev => ({
                  ...prev,
                  preferences: { ...prev.preferences, autoStartBreaks: !prev.preferences.autoStartBreaks }
                }))}
                className={`w-12 h-6 rounded-full transition-all relative ${
                  settings.preferences.autoStartBreaks ? 'bg-blue-500' : 'bg-gray-600'
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full transition-transform absolute top-0.5 ${
                  settings.preferences.autoStartBreaks ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <h4 className="font-semibold text-blue-300 mb-2">Auto-start Breaks Info</h4>
              <p className="text-sm text-blue-200">
                When enabled, a break timer will automatically start after you complete a focus session.
                This helps maintain healthy work-rest cycles and prevents burnout.
              </p>
            </div>

            <div className="border-t border-white/10 pt-6 mt-6">
              <h4 className="text-lg font-bold text-white mb-4">XP & Animations</h4>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg">
                  <div>
                    <h4 className="font-semibold text-white">XP Animations</h4>
                    <p className="text-sm text-gray-300">Show floating XP numbers and particle effects when earning XP</p>
                  </div>
                  <button
                    onClick={() => setSettings(prev => ({
                      ...prev,
                      preferences: { ...prev.preferences, enableXPAnimations: !prev.preferences.enableXPAnimations }
                    }))}
                    className={`w-12 h-6 rounded-full transition-all relative ${
                      settings.preferences.enableXPAnimations ? 'bg-blue-500' : 'bg-gray-600'
                    }`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full transition-transform absolute top-0.5 ${
                      settings.preferences.enableXPAnimations ? 'translate-x-6' : 'translate-x-0.5'
                    }`} />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg">
                  <div>
                    <h4 className="font-semibold text-white">Level-Up Overlays</h4>
                    <p className="text-sm text-gray-300">Display celebration overlay when you level up</p>
                  </div>
                  <button
                    onClick={() => setSettings(prev => ({
                      ...prev,
                      preferences: { ...prev.preferences, enableLevelUpOverlays: !prev.preferences.enableLevelUpOverlays }
                    }))}
                    className={`w-12 h-6 rounded-full transition-all relative ${
                      settings.preferences.enableLevelUpOverlays ? 'bg-blue-500' : 'bg-gray-600'
                    }`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full transition-transform absolute top-0.5 ${
                      settings.preferences.enableLevelUpOverlays ? 'translate-x-6' : 'translate-x-0.5'
                    }`} />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg">
                  <div>
                    <h4 className="font-semibold text-white">Show Small XP Gains</h4>
                    <p className="text-sm text-gray-300">Display animations for XP gains under 5 XP</p>
                  </div>
                  <button
                    onClick={() => setSettings(prev => ({
                      ...prev,
                      preferences: { ...prev.preferences, showSmallXPGains: !prev.preferences.showSmallXPGains }
                    }))}
                    className={`w-12 h-6 rounded-full transition-all relative ${
                      settings.preferences.showSmallXPGains ? 'bg-blue-500' : 'bg-gray-600'
                    }`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full transition-transform absolute top-0.5 ${
                      settings.preferences.showSmallXPGains ? 'translate-x-6' : 'translate-x-0.5'
                    }`} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'privacy' && (
          <div className="space-y-6">
            
            <h3 className="text-lg sm:text-xl font-bold text-white mb-4">Privacy Settings</h3>
            
            {Object.entries(settings.privacy).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between p-4 rounded-lg">
                <div>
                  <h4 className="font-semibold text-white capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </h4>
                  <p className="text-sm text-gray-300">
                    {key === 'showInLeaderboard' && 'Allow your profile to appear in leaderboards'}
                    {key === 'shareStats' && 'Share your statistics with other users'}
                    {key === 'dataCollection' && 'Allow anonymous usage data collection for app improvement'}
                  </p>
                </div>
                <button
                  onClick={() => setSettings(prev => ({
                    ...prev,
                    privacy: { ...prev.privacy, [key]: !value }
                  }))}
                  className={`w-12 h-6 rounded-full transition-all relative ${
                    value ? 'bg-blue-500' : 'bg-gray-600'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform absolute top-0.5 ${
                    value ? 'translate-x-6' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>
            ))}

            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
              <h4 className="font-semibold text-green-300 mb-2">Privacy Protection</h4>
              <ul className="text-sm text-green-200 space-y-1">
                <li>• Your data is encrypted and stored securely</li>
                <li>• We never share personal information with third parties</li>
                <li>• You can export or delete your data at any time</li>
                <li>• Anonymous mode hides your identity in public areas</li>
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'data' && (
          <div className="space-y-6">
            <h3 className="text-lg sm:text-xl font-bold text-white mb-4">Data Management</h3>
            
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 sm:p-6">
              <div className="flex items-center gap-3 mb-4">
                <Download className="h-6 w-6 text-blue-400" />
                <h4 className="text-lg font-semibold text-white">Export Your Data</h4>
              </div>
              <p className="text-gray-300 mb-4 text-sm sm:text-base">
                Download a complete copy of all your Focus Path™ data including sessions, progress, settings, and profile information in JSON format.
              </p>
              <button
                onClick={handleExportData}
                className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 px-4 sm:px-6 py-3 rounded-lg transition-all transform hover:scale-105 font-semibold text-sm sm:text-base"
              >
                Export All Data
              </button>
            </div>

            <div className="bg-gray-500/10 border border-gray-500/30 rounded-lg p-4 sm:p-6">
              <h4 className="text-lg font-semibold text-white mb-3">What Data We Store</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-300">
                <div>
                  <h5 className="font-semibold text-white mb-2">Profile Data:</h5>
                  <ul className="space-y-1">
                    <li>• Display name and avatar</li>
                    <li>• Account preferences</li>
                    <li>• Privacy settings</li>
                    <li>• Subscription information</li>
                  </ul>
                </div>
                <div>
                  <h5 className="font-semibold text-white mb-2">Activity Data:</h5>
                  <ul className="space-y-1">
                    <li>• Focus session records</li>
                    <li>• XP and progress tracking</li>
                    <li>• Streak information</li>
                    <li>• Usage analytics</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 sm:p-6">
              <div className="flex items-center gap-3 mb-4">
                <Trash2 className="h-6 w-6 text-red-400" />
                <h4 className="text-lg font-semibold text-white">Delete Account</h4>
              </div>
              <p className="text-gray-300 mb-4 text-sm sm:text-base">
                Permanently delete your account and all associated data. This action cannot be undone and will remove:
              </p>
              <ul className="text-sm text-red-200 mb-4 space-y-1">
                <li>• All focus sessions and progress</li>
                <li>• XP, achievements, and streaks</li>
                <li>• Profile information and settings</li>
                <li>• Marketplace purchases</li>
                <li>• Subscription and billing data</li>
                <li>• Leaderboard entries</li>
              </ul>
              <button
                onClick={handleDeleteAccount}
                className="bg-red-500/20 hover:bg-red-500/30 text-red-300 px-4 sm:px-6 py-3 rounded-lg transition-all font-semibold text-sm sm:text-base"
              >
                Delete My Account
              </button>
            </div>
          </div>
        )}

        {activeTab === 'support' && (
          <div className="space-y-6">
            <h3 className="text-lg sm:text-xl font-bold text-white mb-4">Customer Support</h3>
            
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 sm:p-6">
              <div className="flex items-center gap-3 mb-4">
                <Mail className="h-6 w-6 text-blue-400" />
                <h4 className="text-lg font-semibold text-white">Contact Us</h4>
              </div>
              <p className="text-gray-300 mb-4 text-sm sm:text-base">
                Need help with Focus Path™? Our support team is here to assist you with any questions, technical issues, or feedback.
              </p>
              <div className="rounded-lg p-4 mb-4">
                <div className="flex items-center gap-3 mb-2">
                  <MessageCircle className="h-5 w-5 text-blue-400" />
                  <span className="font-semibold text-white">Email Support</span>
                </div>
                <p className="text-gray-300 text-sm mb-3">
                  Send us an email and we'll get back to you within 24 hours.
                </p>
                <div className="flex items-center gap-2 text-blue-300">
                  <Mail className="h-4 w-4" />
                  <span className="font-mono text-sm">hemisphirtechnologies@gmail.com</span>
                </div>
              </div>
              <button
                onClick={handleContactSupport}
                className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 px-4 sm:px-6 py-3 rounded-lg transition-all transform hover:scale-105 font-semibold flex items-center gap-2 text-sm sm:text-base"
              >
                <ExternalLink className="h-4 w-4" />
                Open Email Client
              </button>
            </div>

            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 sm:p-6">
              <h4 className="text-lg font-semibold text-white mb-3">What to Include in Your Message</h4>
              <ul className="text-sm text-green-200 space-y-2">
                <li>• <strong>Detailed description</strong> of your issue or question</li>
                <li>• <strong>Steps to reproduce</strong> any problems you're experiencing</li>
                <li>• <strong>Browser and device</strong> information if reporting technical issues</li>
                <li>• <strong>Screenshots</strong> if they help explain the problem</li>
                <li>• Your <strong>account email</strong> (automatically included when using the button above)</li>
              </ul>
            </div>

            <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4 sm:p-6">
              <h4 className="text-lg font-semibold text-white mb-3">Common Support Topics</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-purple-200">
                <div>
                  <h5 className="font-semibold text-white mb-2">Account & Billing:</h5>
                  <ul className="space-y-1">
                    <li>• Subscription management</li>
                    <li>• Payment issues</li>
                    <li>• Account recovery</li>
                    <li>• Data export requests</li>
                  </ul>
                </div>
                <div>
                  <h5 className="font-semibold text-white mb-2">Technical Issues:</h5>
                  <ul className="space-y-1">
                    <li>• Timer not working</li>
                    <li>• Data sync problems</li>
                    <li>• Browser compatibility</li>
                    <li>• Feature requests</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
              <h4 className="font-semibold text-yellow-300 mb-2">Response Time</h4>
              <p className="text-sm text-yellow-200">
                We typically respond to support requests within 24 hours during business days. Premium subscribers receive priority support with faster response times.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Premium Upgrade Modal */}
      <PremiumUpgrade
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        currentTier={subscription?.tier || 'free'}
      />
    </div>
  );
}