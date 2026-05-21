import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSubscription } from '../../hooks/useSubscription';
import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../../firebase';
import { ExtensionBridge } from '../../services/ExtensionBridge';
import { TutorialManager } from '../Tutorial/TutorialManager';
import { FocusTimer } from '../Timer/FocusTimer';
import { SessionHistory } from '../History/SessionHistory';
import { XPProgress } from './XPProgress';
import { DailyTip } from './DailyTip';
import { PersonalizedTips } from './PersonalizedTips';
import { StreakTracker } from '../Streaks/StreakTracker';
import { Leaderboard } from '../Leaderboard/Leaderboard';
import { Marketplace } from '../Marketplace/Marketplace';
import { Settings } from '../Settings/Settings';
import { UserAvatar } from './UserAvatar';
import { CollectionsRoom } from '../Collections/CollectionsRoom';
import { CollectionsPreviewCard } from '../Collections/CollectionsPreviewCard';
import { QuestsPreviewCard } from '../Challenges/QuestsPreviewCard';
import { PremiumUpgrade } from '../Monetization/PremiumUpgrade';
import { SubscriptionManager } from '../Monetization/SubscriptionManager';
import { UsageLimiter } from '../Monetization/UsageLimiter';
import { ChallengesSystem } from '../Challenges/ChallengesSystem';
import { AchievementNotification } from '../Timer/AchievementNotification';
import { DashboardCustomizer } from './DashboardCustomizer';
import { RetroactiveAchievementQueue } from './RetroactiveAchievementQueue';
import { retroactiveAchievementScanner } from '../../services/RetroactiveAchievementScanner';
import { AchievementDefinition } from '../../services/AchievementDefinitions';
import SurveyAnalytics from '../Analytics/SurveyAnalytics';
import RecentSessionsProgress from '../Progress/RecentSessionsProgress';
import SessionAnalyticsDashboard from '../Progress/SessionAnalyticsDashboard';
import FocusScoreHistory from '../Progress/FocusScoreHistory';
import PerformanceInsights from '../Progress/PerformanceInsights';
import DataExport from '../Progress/DataExport';
import { FocusAIScreen } from '../FocusAI/FocusAIScreen';
import { MomoBubble } from '../FocusAI/MomoBubble';
// import { NotificationDropdown } from '../Notifications/NotificationDropdown';
import { XPAnimationContainer } from '../XP/XPAnimationContainer';

import {
  LogOut,
  Timer,
  History,
  Award,
  Target,
  Trophy,
  ShoppingBag,
  Settings as SettingsIcon,
  Star,
  Calendar,
  Sparkles,
  LayoutGrid,
  Eye,
  EyeOff,
  TrendingUp
} from 'lucide-react';

interface DashboardProps {
  profileCompleted?: boolean;
}

export function Dashboard({ profileCompleted }: DashboardProps) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [totalXP, setTotalXP] = useState(0);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [userDisplayName, setUserDisplayName] = useState<string>('');
  const [activeBackground, setActiveBackground] = useState<string | null>(null);
  const [backgroundLoading, setBackgroundLoading] = useState(true);
  const [showCollections, setShowCollections] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [dashboardAchievement, setDashboardAchievement] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // NEW: Hide everything except header
  const [hideEverything, setHideEverything] = useState(false);

  const [showCustomizer, setShowCustomizer] = useState(false);

  // Retroactive achievements state
  const [retroactiveAchievements, setRetroactiveAchievements] = useState<AchievementDefinition[]>([]);
  const [retroactiveXP, setRetroactiveXP] = useState(0);
  const [showRetroactiveQueue, setShowRetroactiveQueue] = useState(false);
  const [retroactiveScanRunning, setRetroactiveScanRunning] = useState(false);
  const [widgetVisibility, setWidgetVisibility] = useState({
    xpProgress: true,
    streakTracker: true,
    questsPreview: true,
    dailyTip: true,
    personalizedTips: true,
    collectionsPreview: true,
  });

  const { logout, currentUser } = useAuth();
  const { subscription } = useSubscription();
  const extensionBridge = ExtensionBridge.getInstance();

  const tablistRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  // Background themes mapping


const backgroundThemes: Record<string, string> = { 'bg_mountain_peaks': 'https://images.pexels.com/photos/1366919/pexels-photo-1366919.jpeg', 'bg_ocean_waves': 'https://images.pexels.com/photos/1001682/pexels-photo-1001682.jpeg', 'bg_forest_path': 'https://images.pexels.com/photos/1496373/pexels-photo-1496373.jpeg', 'bg_desert_dunes': 'https://wallpaperaccess.com/full/100630.jpg', 'bg_northern_lights': 'https://images.pexels.com/photos/1933239/pexels-photo-1933239.jpeg', 'bg_cherry_blossoms': 'https://static.vecteezy.com/system/resources/previews/036/105/188/large_2x/ai-generated-beautiful-japanese-garden-with-cherry-blossom-and-pagoda-ai-generated-free-photo.jpg', 'bg_city_skyline': 'https://wallpapercave.com/wp/wp2329756.jpg', 'bg_lavender_fields': 'https://images.pexels.com/photos/1166209/pexels-photo-1166209.jpeg', 'bg_tropical_beach': 'https://images.pexels.com/photos/457882/pexels-photo-457882.jpeg', 'bg_starry_night': 'https://images.pexels.com/photos/1169754/pexels-photo-1169754.jpeg', 'bg_autumn_forest': 'https://images.pexels.com/photos/33109/fall-autumn-red-season.jpg', 'bg_zen_garden': 'http://getwallpapers.com/wallpaper/full/5/3/6/1077061-download-japanese-garden-wallpapers-1920x1200-screen.jpg', 'bg_modern_workspace': 'https://static.vecteezy.com/system/resources/previews/014/868/436/non_2x/top-view-of-modern-business-office-workspace-background-flat-illustration-of-office-desk-with-laptop-digital-devices-and-notepad-vector.jpg', 'bg_sunset_mountains': 'https://images.pexels.com/photos/1624438/pexels-photo-1624438.jpeg', 'bg_misty_lake': 'https://applescoop.org/image/wallpapers/mac/mountain-clouds-night-lake-digital-art-scenery-4k-wallpaper-intense-vibrant-colors-14-11-2024-1731623822-hd-wallpaper.jpg', 'bg_gradient_abstract': 'https://png.pngtree.com/thumb_back/fh260/background/20231206/pngtree-glowing-abstract-gradient-texture-image_13823746.png' };
  
  const defaultBackground = 'https://images.pexels.com/photos/1257860/pexels-photo-1257860.jpeg';

  // Focus a tab
  const focusTab = useCallback((id: string) => {
    setActiveTab(id);
    const el = tabRefs.current[id];
    if (el) el.focus();
  }, []);

  // Sync profile with extension (initial)
  const syncProfileWithExtension = async () => {
    if (!currentUser) return;
    try {
      const userProfileDoc = await getDoc(doc(db, 'userProfiles', currentUser.uid));
      if (userProfileDoc.exists()) {
        const profileData = userProfileDoc.data();
        extensionBridge.syncUserProfile(profileData);
      }
    } catch (error) {
      console.error('Error syncing profile with extension:', error);
    }
  };

  // Real-time profile updates
  useEffect(() => {
    if (!currentUser) {
      setBackgroundLoading(false);
      return;
    }

    const profileRef = doc(db, 'userProfiles', currentUser.uid);
    const unsub = onSnapshot(
      profileRef,
      (snap) => {
        if (!snap.exists()) {
          setUserDisplayName('New User');
          setTotalXP(0);
          setBackgroundLoading(false);
          return;
        }

        const data = snap.data() as any;
        setUserDisplayName(data.displayName || 'New User');
        setTotalXP(typeof data.totalXP === 'number' ? data.totalXP : 0);

        setActiveBackground(data.activeBackground || null);

        try {
          extensionBridge.syncUserProfile(data);
        } catch (e) {
          console.error('Extension sync failed:', e);
        }

        setBackgroundLoading(false);
        setIsLoading(false);
        setError(null);

        const prefs = data.preferences || {};
        const dashboardWidgets = prefs.dashboardWidgets || {};
        setWidgetVisibility({
          xpProgress: dashboardWidgets.xpProgress !== false,
          streakTracker: dashboardWidgets.streakTracker !== false,
          questsPreview: dashboardWidgets.questsPreview !== false,
          dailyTip: dashboardWidgets.dailyTip !== false,
          personalizedTips: dashboardWidgets.personalizedTips !== false,
          collectionsPreview: dashboardWidgets.collectionsPreview !== false,
        });
      },
      (err) => {
        console.error('Profile snapshot error:', err);
        setBackgroundLoading(false);
        setIsLoading(false);
        setError('Failed to load profile data. Please refresh.');
      }
    );

    return () => unsub();
  }, [currentUser, extensionBridge]);

  // Initial extension sync
  useEffect(() => {
    if (currentUser) syncProfileWithExtension();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  // Retroactive achievement scan
  useEffect(() => {
    const performRetroactiveScan = async () => {
      if (!currentUser || retroactiveScanRunning) return;

      try {
        setRetroactiveScanRunning(true);

        const scanNeeded = await retroactiveAchievementScanner.checkIfScanNeeded(currentUser.uid);

        if (!scanNeeded) {
          setRetroactiveScanRunning(false);
          return;
        }

        const result = await retroactiveAchievementScanner.performRetroactiveScan(currentUser.uid);

        if (result.success && result.newAchievements.length > 0) {
          setRetroactiveAchievements(result.newAchievements);
          setRetroactiveXP(result.totalXPAwarded);
          setShowRetroactiveQueue(true);
        }
      } catch (error) {
        console.error('Error performing retroactive scan:', error);
      } finally {
        setRetroactiveScanRunning(false);
      }
    };

    const timer = setTimeout(() => {
      performRetroactiveScan();
    }, 2000);

    return () => clearTimeout(timer);
  }, [currentUser, retroactiveScanRunning]);

  const handleRetroactiveQueueComplete = () => {
    setShowRetroactiveQueue(false);
    setRetroactiveAchievements([]);
    setRefreshTrigger(prev => prev + 1);
  };

  // When session ends → refresh UI
  const handleSessionComplete = (xp: number) => {
    checkForDashboardAchievements(xp);
    // Add small delay to ensure Firebase data propagates before refreshing
    setTimeout(() => {
      setRefreshTrigger(prev => prev + 1);
    }, 500);
  };

  // XP milestone achievements
  const checkForDashboardAchievements = async (_xp: number) => {
    if (!currentUser) return;

    try {
      const profileRef = doc(db, 'userProfiles', currentUser.uid);
      const profileSnap = await getDoc(profileRef);
      const profileData = profileSnap.exists() ? (profileSnap.data() as any) : {};
      const xpNow = profileData.totalXP || 0;
      const milestones = profileData.milestones || {};

      if (xpNow >= 100 && milestones.first100 !== true) {
        setDashboardAchievement({
          id: 'first_hundred_dashboard',
          name: 'Century Club!',
          description: "You've earned your first 100 XP!",
          icon: '💯',
          rarity: 'common',
          xpReward: 25
        });

        await setDoc(profileRef, {
          milestones: { ...milestones, first100: true }
        }, { merge: true });
      }

      if (xpNow >= 500 && milestones.hit500 !== true) {
        setDashboardAchievement({
          id: 'level_2_dashboard',
          name: 'Level Up!',
          description: 'Welcome to Level 2, Focus Practitioner!',
          icon: '⬆️',
          rarity: 'rare',
          xpReward: 50
        });

        await setDoc(profileRef, {
          milestones: { ...milestones, hit500: true }
        }, { merge: true });
      }
    } catch (error) {
      console.error('Error checking dashboard achievements:', error);
    }
  };

  const handleSettingsChange = () => setRefreshTrigger(prev => prev + 1);
  const handleMarketplaceChange = () => {
    setRefreshTrigger(prev => prev + 1);
    syncProfileWithExtension();
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const handleAvatarClick = () => setShowCollections(true);
  const handleUpgrade = () => setShowUpgradeModal(true);
  const handleCustomizerClose = () => {
    setShowCustomizer(false);
    setRefreshTrigger(prev => prev + 1);
  };

  const tabs = [
    { id: 'dashboard', name: 'Dashboard', icon: Target },
    { id: 'timer', name: 'Timer', icon: Timer },
    { id: 'momo', name: 'Momo AI', icon: Sparkles },
    { id: 'history', name: 'History', icon: History },
    { id: 'progress', name: 'Progress', icon: Award },
    { id: 'analytics', name: 'Analytics', icon: TrendingUp },
    { id: 'challenges', name: 'Quests', icon: Calendar },
    { id: 'leaderboard', name: 'Leaderboard', icon: Trophy },
    { id: 'marketplace', name: 'Marketplace', icon: ShoppingBag },
    // { id: 'subscription', name: 'Subscription', icon: CreditCard },
    { id: 'settings', name: 'Settings', icon: SettingsIcon },
  ];

  const currentBackgroundUrl =
    activeBackground && backgroundThemes[activeBackground]
      ? backgroundThemes[activeBackground]
      : defaultBackground;

  // Tab keyboard nav
  const onTablistKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault();

    const i = tabs.findIndex(t => t.id === activeTab);
    if (i < 0) return;

    let next = i;
    if (e.key === 'ArrowRight') next = (i + 1) % tabs.length;
    else if (e.key === 'ArrowLeft') next = (i - 1 + tabs.length) % tabs.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = tabs.length - 1;

    focusTab(tabs[next].id);
  };

  // Autofocus active tab on mount
 
useEffect(() => {
  const id = requestAnimationFrame(() => {
    tabRefs.current[activeTab]?.focus();
  });

  return () => cancelAnimationFrame(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);
  // Skip-to-main-content accessibility
  const skipToMainContent = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.preventDefault();
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      mainContent.focus();
      mainContent.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <TutorialManager>
      <div className="min-h-screen relative">

        {/* Skip link */}
        <a
          href="#main-content"
          onClick={skipToMainContent}
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50
                     bg-blue-600 text-white px-4 py-2 rounded-lg font-medium"
        >
          Skip to main content
        </a>

        {/* Dynamic Background Layer */}
        <div
          className={`fixed inset-0 bg-cover bg-center transition-all duration-1000 z-0
                      ${backgroundLoading ? 'opacity-0' : 'opacity-100'}`}
          style={{ backgroundImage: `url('${currentBackgroundUrl}')` }}
        />

        {/* Fallback while loading */}
        {backgroundLoading && (
          <div className="fixed inset-0 bg-neutral-900 z-0" />
        )}

        {/* Gradient Overlay */}
        <div className="fixed inset-0 z-10"
          style={{ background: 'linear-gradient(135deg, rgba(13,1,24,0.88) 0%, rgba(26,5,51,0.88) 50%, rgba(45,16,96,0.88) 100%)' }} />

        {/* Content Layer */}
        <div className="relative z-20 min-h-screen">

          {/* ------------------------------------------------------------------ */}
          {/* HEADER — stays visible even when everything else is hidden        */}
          {/* ------------------------------------------------------------------ */}

          <header className="backdrop-blur-lg border-b" style={{ background: 'rgba(13,1,24,0.7)', borderColor: 'rgba(139,92,246,0.2)' }} role="banner">
            <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-10">
              <div className="flex justify-between items-center h-16 sm:h-18">

                {/* Logo + title */}
                <div className="flex items-center gap-3 sm:gap-4">
                  <img
                    src="/icon16.png"
                    alt="Focus Path™ Logo"
                    className="h-9 w-9 sm:h-11 sm:w-11 rounded-xl"
                  />
                  <div className="flex items-center gap-2 sm:gap-3">
                    <h1 className="text-lg sm:text-2xl font-bold text-white">Focus Path™</h1>
                    <span className="text-xs sm:text-sm bg-white/10 text-gray-300
                                     px-2 py-1 rounded-full font-medium">
                      v0.1.5
                    </span>
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex items-center gap-2 sm:gap-4">

                  {/* Subscription badge */}
                  {subscription && (
                    <div className="hidden md:flex items-center gap-2
                                    bg-white/10 rounded-lg px-3 py-2">
                      {subscription.tier === 'standard' ? (
                        <Star className="h-4 w-4 text-blue-400" />
                      ) : (
                        <Sparkles className="h-4 w-4 text-purple-400" />
                      )}
                      <span className="text-white text-sm capitalize">
                        {subscription.tier}
                      </span>

                      {subscription.tier === 'standard' && (
                        <button
                          onClick={() => setShowUpgradeModal(true)}
                          className="ml-2 text-xs bg-purple-500/20 hover:bg-purple-500/30
                                     text-purple-300 px-2 py-1 rounded transition-all"
                        >
                          Upgrade
                        </button>
                      )}
                    </div>
                  )}

                  {/* Notification Bell */}
                  {/* <NotificationDropdown /> */}

                  {/* Avatar */}
                  <button
                    onClick={handleAvatarClick}
                    className="flex items-center gap-2 sm:gap-3 hover:bg-white/10
                               p-1 sm:p-2 rounded-lg transition-all group"
                    title="View Collections"
                  >
                    <UserAvatar refreshTrigger={refreshTrigger} size="medium" />
                    <div className="text-right hidden sm:block">
                      <div className="text-sm font-medium text-white
                                      group-hover:text-violet-300 transition-colors">
                        {userDisplayName}
                      </div>
                      <div className="text-xs text-gray-300
                                      group-hover:text-violet-400 transition-colors">
                        {subscription?.tier === 'standard'
                          ? 'Standard User'
                          : 'Premium User'}
                      </div>
                    </div>
                  </button>

                  {/* Dashboard Customizer */}
                  <button
                    onClick={() => setShowCustomizer(true)}
                    className="flex items-center gap-1 sm:gap-2
                               bg-violet-500/20 hover:bg-violet-500/30 text-violet-300
                               px-2 sm:px-4 py-2 rounded-lg transition-all"
                    title="Customize Dashboard"
                  >
                    <LayoutGrid className="h-4 w-4" />
                    <span className="hidden sm:inline">Customize</span>
                  </button>

                  {/* ----------------------------------------------------------- */}
                  {/* NEW — Hide Everything Except Header Button                 */}
                  {/* ----------------------------------------------------------- */}

                  <button
                    onClick={() => setHideEverything(!hideEverything)}
                    className="flex items-center gap-1 sm:gap-2
                               bg-white/10 hover:bg-white/20 text-gray-200
                               px-2 sm:px-4 py-2 rounded-lg transition-all"
                    title={hideEverything ? "Show Dashboard" : "Hide Dashboard"}
                  >
                    {hideEverything ? (
                      <Eye className="h-4 w-4 text-green-300" />
                    ) : (
                      <EyeOff className="h-4 w-4 text-gray-300" />
                    )}
                    <span className="hidden sm:inline">
                      {hideEverything ? "Show" : "Hide"}
                    </span>
                  </button>

                  {/* Logout */}
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-1 sm:gap-2
                               bg-red-500/20 hover:bg-red-500/30 text-red-300
                               px-2 sm:px-4 py-2 rounded-lg transition-all"
                  >
                    <LogOut className="h-4 w-4" />
                    <span className="hidden sm:inline">Logout</span>
                  </button>
                </div>
              </div>
            </div>
          </header>

          {/* ------------------------------------------------------------------ */}
          {/* NAVIGATION TABS — now collapsible with blinds animation           */}
          {/* ------------------------------------------------------------------ */}

          <nav
            className={`
              backdrop-blur-lg border-b
              transition-all duration-700 overflow-hidden
              ${hideEverything ? "max-h-0 opacity-0 -translate-y-2" : "max-h-[200px] opacity-100"}
            `}
            style={{ background: 'rgba(13,1,24,0.5)', borderColor: 'rgba(139,92,246,0.15)' }}
            role="navigation"
            aria-label="Main navigation"
          >
            <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-10">
              <div
                ref={tablistRef}
                role="tablist"
                aria-label="Main"
                tabIndex={0}
                onKeyDown={onTablistKeyDown}
                className="flex justify-center space-x-1 sm:space-x-2 overflow-x-auto scrollbar-hide
                           py-1 focus:outline-none"
              >
                {tabs.map((tab) => {
                  const IconComp = tab.icon;
                  const selected = activeTab === tab.id;

                  return (
                    <button
                      key={tab.id}
                      ref={(el) => (tabRefs.current[tab.id] = el)}
                      role="tab"
                      aria-selected={selected}
                      tabIndex={selected ? 0 : -1}
                      onClick={() => focusTab(tab.id)}
                      className={`
                        flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-3 sm:py-4
                        border-b-2 font-medium text-xs sm:text-sm transition-all whitespace-nowrap
                        ${selected
                          ? "border-violet-400 text-violet-300"
                          : "border-transparent text-gray-400 hover:text-white hover:border-violet-500/50"}
                      `}
                    >
                      <IconComp className="h-4 w-4" />
                      <span className="hidden sm:inline">{tab.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </nav>

          {/* ------------------------------------------------------------------ */}
          {/* WELCOME MESSAGE — also collapsible */}
          {/* ------------------------------------------------------------------ */}

          {!isLoading && !error && (
            <div
              className={`
                max-w-7xl mx-auto px-3 sm:px-6 lg:px-10 pt-6 sm:pt-8
                transition-all duration-700 overflow-hidden
                ${hideEverything ? "max-h-0 opacity-0 -translate-y-2" : "max-h-[800px] opacity-100"}
              `}
            >
              <div className="rounded-2xl p-6 sm:p-8 mb-6 sm:mb-8 animate-slide-up shadow-xl"
                style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.15) 0%, rgba(79,70,229,0.15) 100%)', border: '1px solid rgba(139,92,246,0.3)' }}>
                <div className="flex flex-col sm:flex-row items-start sm:items-center
                                gap-4 sm:gap-5">
                  <div className="text-4xl sm:text-5xl animate-bounce-in" aria-hidden="true">
                    👋
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl sm:text-3xl font-bold text-white animate-slide-down mb-2">
                      Welcome back, {userDisplayName}!
                    </h2>
                    <p className="text-base sm:text-lg text-blue-200 animate-fade-in">
                      {totalXP > 0
                        ? `You have ${totalXP} XP. Ready to level up today?`
                        : "Let's make today productive! Choose an action below to get started."}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
          {/* ------------------------------------------------------------------ */}
          {/* MAIN CONTENT AREA — FULL BLINDS COLLAPSE                          */}
          {/* ------------------------------------------------------------------ */}

          <main
            id="main-content"
            role="main"
            tabIndex={-1}
            aria-live="polite"
            aria-atomic="false"
            className={`
              max-w-7xl mx-auto px-3 sm:px-6 lg:px-10 py-6 sm:py-10 pb-12
              transition-all duration-700 overflow-hidden
              ${hideEverything ? "max-h-0 opacity-0 translate-y-4" : "max-h-[9000px] opacity-100"}
            `}
          >

            {/* Loading */}
            {isLoading && (
              <div className="flex items-center justify-center min-h-[400px]" role="status" aria-live="polite">
                <div className="text-center">
                  <div className="inline-block animate-spin rounded-full h-12 w-12
                                  border-4 border-white/20 border-t-white mb-4"></div>
                  <p className="text-white text-lg">Loading your dashboard...</p>
                </div>
              </div>
            )}

            {/* Error */}
            {error && !isLoading && (
              <div className="max-w-2xl mx-auto" role="alert" aria-live="assertive">
                <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-6 text-center">
                  <div className="text-5xl mb-4">⚠️</div>
                  <h3 className="text-xl font-bold text-red-300 mb-2">Something went wrong</h3>
                  <p className="text-red-200 mb-4">{error}</p>
                  <button
                    onClick={() => window.location.reload()}
                    className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg transition-all"
                  >
                    Refresh Page
                  </button>
                </div>
              </div>
            )}

            {/* CONTENT BELOW ONLY SHOWS WHEN NOT LOADING AND NO ERROR */}
            {!isLoading && !error && (
              <>
                {/* DASHBOARD TAB */}
                {activeTab === 'dashboard' && (
                  <div className="space-y-6 sm:space-y-8">

                    {/* -------------------------- */}
                    {/* FIRST ROW CARDS (TIPS / COLLECTIONS) */}
                    {/* -------------------------- */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 lg:gap-8">
                      {widgetVisibility.dailyTip && <DailyTip />}
                      {widgetVisibility.personalizedTips && (
                        <PersonalizedTips refreshTrigger={refreshTrigger} />
                      )}
                      {widgetVisibility.collectionsPreview && (
                        <CollectionsPreviewCard
                          refreshTrigger={refreshTrigger}
                          onOpenCollections={handleAvatarClick}
                        />
                      )}
                    </div>

                    {/* -------------------------- */}
                    {/* SECOND ROW CARDS (XP / STREAKS / QUESTS) */}
                    {/* -------------------------- */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 lg:gap-8">
                      {widgetVisibility.xpProgress && (
                        <XPProgress
                          totalXP={totalXP}
                          refreshTrigger={refreshTrigger}
                          detailed={false}
                          size="medium"
                        />
                      )}

                      {widgetVisibility.streakTracker && (
                        <StreakTracker refreshTrigger={refreshTrigger} />
                      )}

                      {widgetVisibility.questsPreview && (
                        <QuestsPreviewCard
                          refreshTrigger={refreshTrigger}
                          onOpenQuests={() => setActiveTab('challenges')}
                        />
                      )}
                    </div>

                    {/* -------------------------- */}
                    {/* QUICK ACTION CTA BOX */}
                    {/* -------------------------- */}
                    <div className="max-w-3xl mx-auto mt-8">
                      <div className="glass-card rounded-2xl p-6 sm:p-8 shadow-2xl hover-lift animate-fade-in">
                        <div className="text-center mb-8">
                          <div
                            className="bg-gradient-to-r from-green-500 to-emerald-600 p-4
                                       rounded-2xl mx-auto w-fit mb-4 animate-pulse-glow"
                            aria-hidden="true"
                          >
                            <Target className="h-8 w-8 sm:h-10 sm:w-10 text-white animate-float" />
                          </div>
                          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
                            Ready to Focus?
                          </h2>
                          <p className="text-base sm:text-lg text-gray-300">
                            Choose your next action to boost productivity
                          </p>
                        </div>

                        <div className="space-y-4 sm:space-y-5">
                          <button
                            onClick={() => setActiveTab('timer')}
                            className="w-full bg-gradient-to-r from-violet-600 to-indigo-600
                                       text-white py-5 sm:py-6 px-6 rounded-xl hover:from-violet-700 hover:to-indigo-700
                                       transition-all transform hover:scale-[1.02] active:scale-[0.98]
                                       flex items-center justify-center gap-3 font-semibold text-lg sm:text-xl shadow-lg
                                       focus:outline-none focus:ring-4 focus:ring-blue-500/50"
                          >
                            <Timer className="h-6 w-6 sm:h-7 sm:w-7" />
                            <span>Start Focus Session</span>
                          </button>

                          <div className="grid grid-cols-2 gap-4 sm:gap-5">
                            <button
                              onClick={() => setActiveTab('marketplace')}
                              className="bg-white/10 hover:bg-white/20 text-white py-4 sm:py-5 px-4
                                         rounded-xl transition-all flex flex-col sm:flex-row items-center justify-center
                                         gap-2 text-base sm:text-lg font-medium hover:scale-[1.02] active:scale-[0.98]
                                         focus:outline-none focus:ring-2 focus:ring-white/50"
                            >
                              <ShoppingBag className="h-5 w-5 sm:h-5 sm:w-5" />
                              <span>Marketplace</span>
                            </button>

                            <button
                              onClick={() => setActiveTab('challenges')}
                              className="bg-white/10 hover:bg-white/20 text-white py-4 sm:py-5 px-4
                                         rounded-xl transition-all flex flex-col sm:flex-row items-center justify-center
                                         gap-2 text-base sm:text-lg font-medium hover:scale-[1.02] active:scale-[0.98]
                                         focus:outline-none focus:ring-2 focus:ring-white/50"
                            >
                              <Calendar className="h-5 w-5 sm:h-5 sm:w-5" />
                              <span>Quests</span>
                            </button>
                          </div>

                          <button
                            onClick={() => setActiveTab('history')}
                            className="w-full bg-white/10 hover:bg-white/20 text-white py-4 px-4 rounded-xl
                                       transition-all flex items-center justify-center gap-2 text-base sm:text-lg
                                       hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-2
                                       focus:ring-white/50"
                          >
                            <History className="h-5 w-5" />
                            <span>View Session History</span>
                          </button>
                        </div>
                      </div>
                    </div>

                  </div>
                )}

                {/* TIMER TAB */}
                {activeTab === 'timer' && (
                  <div className="max-w-3xl mx-auto">
                    <UsageLimiter feature="sessions" onUpgrade={handleUpgrade}>
                      <FocusTimer onSessionComplete={handleSessionComplete} />
                    </UsageLimiter>
                  </div>
                )}

                {/* HISTORY */}
                {activeTab === 'history' && (
                  <SessionHistory refreshTrigger={refreshTrigger} />
                )}
                {/* PROGRESS TAB */}
                {activeTab === 'progress' && (
                  <div className="max-w-6xl mx-auto space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 auto-rows-fr">
                      <div className="lg:col-span-2 flex">
                        <XPProgress
                          totalXP={totalXP}
                          refreshTrigger={refreshTrigger}
                          detailed
                        />
                      </div>
                      <div className="flex">
                        <StreakTracker refreshTrigger={refreshTrigger} />
                      </div>
                    </div>

                    <RecentSessionsProgress refreshTrigger={refreshTrigger} />

                    <PerformanceInsights refreshTrigger={refreshTrigger} />
                  </div>
                )}

                {/* MOMO AI TAB */}
                {activeTab === 'momo' && (
                  <div className="max-w-4xl mx-auto">
                    <FocusAIScreen refreshTrigger={refreshTrigger} onNavigate={focusTab} />
                  </div>
                )}

                {/* ANALYTICS TAB */}
                {activeTab === 'analytics' && (
                  <div className="max-w-6xl mx-auto space-y-6">
                    <SessionAnalyticsDashboard refreshTrigger={refreshTrigger} />

                    <FocusScoreHistory refreshTrigger={refreshTrigger} />

                    <SurveyAnalytics />

                    <DataExport />
                  </div>
                )}

                {/* CHALLENGES / QUESTS TAB */}
                {activeTab === 'challenges' && (
                  <div className="max-w-6xl mx-auto">
                    <ChallengesSystem
                      refreshTrigger={refreshTrigger}
                      onChallengeComplete={() => {
                        setRefreshTrigger(prev => prev + 1);
                      }}
                    />
                  </div>
                )}

                {/* LEADERBOARD TAB */}
                {activeTab === 'leaderboard' && (
                  <div className="max-w-4xl mx-auto">
                    <Leaderboard refreshTrigger={refreshTrigger} />
                  </div>
                )}

                {/* MARKETPLACE TAB */}
                {activeTab === 'marketplace' && (
                  <div className="max-w-6xl mx-auto">
                    <Marketplace
                      refreshTrigger={refreshTrigger}
                      onMarketplaceChange={handleMarketplaceChange}
                    />
                  </div>
                )}

                {/* SUBSCRIPTION TAB */}
                {activeTab === 'subscription' && (
                  <div className="max-w-6xl mx-auto">
                    <SubscriptionManager onUpgrade={handleUpgrade} />
                  </div>
                )}

                {/* SETTINGS TAB */}
                {activeTab === 'settings' && (
                  <Settings onSettingsChange={handleSettingsChange} />
                )}
              </>
            )}

          </main>

          {/* -------------------------------------------------------------- */}
          {/* COLLECTIONS ROOM MODAL (does NOT collapse with hideEverything) */}
          {/* -------------------------------------------------------------- */}

          <CollectionsRoom
            isOpen={showCollections}
            onClose={() => {
              setShowCollections(false);
              setRefreshTrigger(prev => prev + 1);
            }}
          />

          {/* PREMIUM UPGRADE MODAL */}
          {showUpgradeModal && (
            <PremiumUpgrade
              isOpen={showUpgradeModal}
              onClose={() => setShowUpgradeModal(false)}
            />
          )}

          {/* ACHIEVEMENT POPUP */}
          {dashboardAchievement && (
            <AchievementNotification
              achievement={dashboardAchievement}
              isVisible={!!dashboardAchievement}
              onClose={() => setDashboardAchievement(null)}
              autoCloseDelay={4000}
            />
          )}

          {/* DASHBOARD CUSTOMIZER */}
          <DashboardCustomizer
            isOpen={showCustomizer}
            onClose={handleCustomizerClose}
            onWidgetVisibilityChange={() => setRefreshTrigger(prev => prev + 1)}
          />

          {/* RETROACTIVE ACHIEVEMENT QUEUE */}
          {showRetroactiveQueue && retroactiveAchievements.length > 0 && (
            <RetroactiveAchievementQueue
              achievements={retroactiveAchievements}
              totalXP={retroactiveXP}
              onComplete={handleRetroactiveQueueComplete}
            />
          )}

          {/* XP ANIMATION CONTAINER */}
          <XPAnimationContainer />

          {/* MOMO FLOATING BUBBLE */}
          <MomoBubble onNavigate={focusTab} />
        </div>
      </div>
    </TutorialManager>
  );
}

export default Dashboard;
