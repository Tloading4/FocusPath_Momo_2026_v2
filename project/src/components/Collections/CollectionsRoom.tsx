import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  collection,
  query,
  getDocs,
  doc,
  getDoc,
  setDoc,
  FirestoreError,
} from 'firebase/firestore';
import { db } from '../../firebase';
import {
  X,
  Trophy,
  Star,
  Zap,
  ShoppingBag,
  TrendingUp,
  Lock,
  Target,
  Sparkles,
} from 'lucide-react';
import { getCustomAvatar } from '../../services/supabaseAvatarService';
import { LevelingService } from '../../services/LevelingService';

// ——— Types ———
interface Purchase {
  id: string;
  itemId: string;
  itemName?: string;
  category: 'avatar' | 'background' | 'powerup';
  datePurchased: Date;
  xpSpent: number;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string; // emoji for now
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  unlockedAt: Date;
  category: 'Progress' | 'Focus' | 'Consistency' | 'Collection';
}

interface UserStats {
  totalXP: number;
  currentStreak: number;
  longestStreak: number;
  totalSessions: number;
  totalFocusTime: number; // minutes
  level: number;
  joinDate: Date;
}

interface CollectionsRoomProps {
  isOpen: boolean;
  onClose: () => void;
  refreshTrigger?: number;
}

// ——— Catalogs ———
const avatarItems = {
  avatar_rocket: { emoji: '🚀', name: 'Rocket Avatar' },
  avatar_ninja: { emoji: '🥷', name: 'Ninja Avatar' },
  avatar_wizard: { emoji: '🧙‍♂️', name: 'Wizard Avatar' },
  avatar_robot: { emoji: '🤖', name: 'Robot Avatar' },
  avatar_crown: { emoji: '👑', name: 'Crown Avatar' },
  avatar_fire: { emoji: '🔥', name: 'Fire Avatar' },
  avatar_star: { emoji: '⭐', name: 'Star Avatar' },
  avatar_lightning: { emoji: '⚡', name: 'Lightning Avatar' },
  avatar_gem: { emoji: '💎', name: 'Gem Avatar' },
  avatar_trophy: { emoji: '🏆', name: 'Trophy Avatar' },
  avatar_custom_photo: { emoji: '📸', name: 'Custom Photo Avatar' },
} as const;

const backgroundItems = {
   bg_default_classic: {
    emoji: '✨',
    name: 'Default Background',
    preview: 'https://images.pexels.com/photos/1257860/pexels-photo-1257860.jpeg',
  },
  bg_mountain_peaks: {
    emoji: '🏔️',
    name: 'Mountain Peaks',
    preview: 'https://images.pexels.com/photos/1366919/pexels-photo-1366919.jpeg',
  },
  bg_ocean_waves: {
    emoji: '🌊',
    name: 'Ocean Waves',
    preview: 'https://images.pexels.com/photos/1001682/pexels-photo-1001682.jpeg',
  },
  bg_forest_path: {
    emoji: '🌲',
    name: 'Forest Path',
    preview: 'https://images.pexels.com/photos/1496373/pexels-photo-1496373.jpeg',
  },
  bg_desert_dunes: {
    emoji: '🏜️',
    name: 'Desert Dunes',
    preview: 'https://wallpaperaccess.com/full/100630.jpg',
  },
  bg_northern_lights: {
    emoji: '🌌',
    name: 'Northern Lights',
    preview: 'https://images.pexels.com/photos/1933239/pexels-photo-1933239.jpeg',
  },
  bg_cherry_blossoms: {
    emoji: '🌸',
    name: 'Cherry Blossoms',
    preview:
      'https://static.vecteezy.com/system/resources/previews/036/105/188/large_2x/ai-generated-beautiful-japanese-garden-with-cherry-blossom-and-pagoda-ai-generated-free-photo.jpg',
  },
  bg_city_skyline: {
    emoji: '🏙️',
    name: 'City Skyline',
    preview: 'https://wallpapercave.com/wp/wp2329756.jpg',
  },
  bg_lavender_fields: {
    emoji: '💜',
    name: 'Lavender Fields',
    preview: 'https://images.pexels.com/photos/1166209/pexels-photo-1166209.jpeg',
  },
  bg_tropical_beach: {
    emoji: '🏝️',
    name: 'Tropical Beach',
    preview: 'https://images.pexels.com/photos/457882/pexels-photo-457882.jpeg',
  },
  bg_starry_night: {
    emoji: '✨',
    name: 'Starry Night',
    preview: 'https://images.pexels.com/photos/1169754/pexels-photo-1169754.jpeg',
  },
  bg_autumn_forest: {
    emoji: '🍂',
    name: 'Autumn Forest',
    preview: 'https://images.pexels.com/photos/33109/fall-autumn-red-season.jpg',
  },
  bg_zen_garden: {
    emoji: '🪨',
    name: 'Zen Garden',
    preview:
      'http://getwallpapers.com/wallpaper/full/5/3/6/1077061-download-japanese-garden-wallpapers-1920x1200-screen.jpg',
  },
  bg_modern_workspace: {
    emoji: '💼',
    name: 'Modern Workspace',
    preview:
      'https://static.vecteezy.com/system/resources/previews/014/868/436/non_2x/top-view-of-modern-business-office-workspace-background-flat-illustration-of-office-desk-with-laptop-digital-devices-and-notepad-vector.jpg',
  },
  bg_sunset_mountains: {
    emoji: '🌄',
    name: 'Sunset Mountains',
    preview: 'https://images.pexels.com/photos/1624438/pexels-photo-1624438.jpeg',
  },
  bg_misty_lake: {
    emoji: '🌫️',
    name: 'Misty Lake',
    preview: 'https://applescoop.org/image/wallpapers/mac/mountain-clouds-night-lake-digital-art-scenery-4k-wallpaper-intense-vibrant-colors-14-11-2024-1731623822-hd-wallpaper.jpg',
  },
  bg_gradient_abstract: {
    emoji: '🎨',
    name: 'Gradient Abstract',
    preview:
      'https://png.pngtree.com/thumb_back/fh260/background/20231206/pngtree-glowing-abstract-gradient-texture-image_13823746.png',
  },
} as const;

const powerUpItems = {
  powerup_motivation_boost: { emoji: '💪', name: 'Motivation Boost' },
  powerup_double_xp: { emoji: '✨', name: 'Double XP' },
  powerup_streak_shield: { emoji: '🛡️', name: 'Streak Shield' },
  powerup_focus_multiplier: { emoji: '🎯', name: 'Focus Multiplier' },
} as const;

// ——— Helpers ———
const rarityColor = (rarity: Achievement['rarity']) => {
  switch (rarity) {
    case 'common':
      return 'from-gray-500 to-gray-600';
    case 'rare':
      return 'from-blue-500 to-blue-600';
    case 'epic':
      return 'from-purple-500 to-purple-600';
    case 'legendary':
      return 'from-yellow-500 to-orange-600';
  }
};

const rarityBorder = (rarity: Achievement['rarity']) => {
  switch (rarity) {
    case 'common':
      return 'border-gray-500/50';
    case 'rare':
      return 'border-blue-500/50';
    case 'epic':
      return 'border-purple-500/50';
    case 'legendary':
      return 'border-yellow-500/50';
  }
};

const tabToCategory = (tabId: ActiveTab): Purchase['category'] | null => {
  switch (tabId) {
    case 'avatars':
      return 'avatar';
    case 'backgrounds':
      return 'background';
    default:
      return null;
  }
};

// ——— Tabs ———
export type ActiveTab =
  | 'overview'
  | 'achievements'
  | 'avatars'
  | 'backgrounds';

export function CollectionsRoom({
  isOpen,
  onClose,
  refreshTrigger = 0,
}: CollectionsRoomProps) {
  const { currentUser } = useAuth();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [selectedBackground, setSelectedBackground] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [customAvatarUrl, setCustomAvatarUrl] = useState<string | null>(null);
  const [activeAvatar, setActiveAvatar] = useState<string | null>(null);
  const [activeBackgroundId, setActiveBackgroundId] = useState<string | null>(null);
  const [userLevel, setUserLevel] = useState(1);

  const getPurchasesByCategory = (category: Purchase['category']) =>
    purchases.filter((p) => p.category === category);

  const handleEquipAvatar = async (itemId: string) => {
    if (!currentUser) return;

    // Check if it's a level reward avatar
    const levelRewardAvatars: Record<string, number> = {
      'avatar_star': 5,
      'avatar_lightning': 10,
      'avatar_gem': 15,
      'avatar_trophy': 20,
      'avatar_crown': 25,
    };

    const requiredLevel = levelRewardAvatars[itemId];
    if (requiredLevel && userLevel < requiredLevel) {
      alert(`🔒 You need to reach Level ${requiredLevel} to equip this avatar!`);
      return;
    }

    try {
      const profileRef = doc(db, 'userProfiles', currentUser.uid);
      const updateData: { activeAvatar: string; lastUpdated: Date; customAvatarUrl?: string } = {
        activeAvatar: itemId,
        lastUpdated: new Date(),
      };

      if (itemId === 'avatar_custom_photo' && customAvatarUrl) {
        updateData.customAvatarUrl = customAvatarUrl;
      }

      await setDoc(profileRef, updateData, { merge: true });
      setActiveAvatar(itemId);
      alert('🎭 Avatar equipped!');
    } catch (error) {
      console.error('Failed to equip avatar:', error);
      alert('Failed to equip avatar. Please try again.');
    }
  };

  const handleEquipBackground = async (itemId: string) => {
    if (!currentUser) return;

    try {
      const profileRef = doc(db, 'userProfiles', currentUser.uid);
      await setDoc(profileRef, { activeBackground: itemId, lastUpdated: new Date() }, { merge: true });
      setActiveBackgroundId(itemId);
    } catch (error) {
      console.error('Failed to equip background:', error);
      alert('Failed to equip background. Please try again.');
    }
  };

  const getItemDetails = (
    itemId: string,
    category: Purchase['category']
  ): { emoji: string; name: string; preview?: string } => {
    switch (category) {
      case 'avatar':
        return (
          (avatarItems as Record<string, { emoji: string; name: string }>)[
            itemId
          ] || { emoji: '❓', name: 'Unknown Avatar' }
        );
      case 'background':
        return (
          (backgroundItems as Record<string, { emoji: string; name: string; preview?: string }>)[
            itemId
          ] || { emoji: '❓', name: 'Unknown Background' }
        );
      case 'powerup':
        return (
          (powerUpItems as Record<string, { emoji: string; name: string }>)[
            itemId
          ] || { emoji: '❓', name: 'Unknown Power-up' }
        );
      default:
        return { emoji: '❓', name: 'Unknown Item' };
    }
  };

  const fetchCollectionsData = async () => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Profile (XP, join date, active items)
      const profileSnap = await getDoc(doc(db, 'userProfiles', currentUser.uid));
      const profileData = profileSnap.exists() ? profileSnap.data() : ({} as any);
      const totalXP: number = Number(profileData.totalXP || 0);
      const joinDate: Date = profileData.createdAt?.toDate?.() || new Date();
      const level = LevelingService.getLevelFromXP(totalXP);
      setUserLevel(level);
      setActiveAvatar(profileData.activeAvatar || null);
      setActiveBackgroundId(profileData.activeBackground || null);

      // Streaks
      const streakSnap = await getDoc(doc(db, 'streaks', currentUser.uid));
      const streakData = streakSnap.exists() ? streakSnap.data() : ({} as any);
      const currentStreak: number = Number(streakData.currentStreak || 0);
      const longestStreak: number = Number(streakData.longestStreak || 0);

      // Purchases
      const purchasesQuery = query(
        collection(db, 'userProfiles', currentUser.uid, 'purchases')
      );
      const purchasesSnapshot = await getDocs(purchasesQuery);
      const userPurchases: Purchase[] = purchasesSnapshot.docs.map((d) => {
        const data = d.data() as any;
        return {
          id: d.id,
          itemId: String(data.itemId || ''),
          itemName: data.itemName,
          category: (data.category || 'avatar') as Purchase['category'],
          datePurchased: data.datePurchased?.toDate?.() || new Date(),
          xpSpent: Number(data.xpSpent || 0),
        } as Purchase;
      });

      // Sessions (aggregate)
      const sessionsCol = collection(db, 'userProfiles', currentUser.uid, 'sessions');
      const sessionsSnap = await getDocs(sessionsCol);
      let totalSessions = 0;
      let totalFocusTimeSec = 0;
      sessionsSnap.forEach((d) => {
        const data = d.data() as any;
        // Only count completed sessions (completed !== false allows legacy truthy)
        if (data.completed !== false) {
          totalSessions += 1;
          const duration = Number(data.duration || 0); // assume seconds
          totalFocusTimeSec += isNaN(duration) ? 0 : duration;
        }
      });

      const computed: UserStats = {
        totalXP,
        currentStreak,
        longestStreak,
        totalSessions,
        totalFocusTime: Math.round(totalFocusTimeSec / 60),
        level: LevelingService.getLevelFromXP(totalXP),
        joinDate,
      };

      setUserStats(computed);

      // Deduplicate purchases by itemId, keeping only the most recent purchase
      const uniquePurchases = userPurchases.reduce((acc, purchase) => {
        const existing = acc.find(p => p.itemId === purchase.itemId);
        if (!existing) {
          acc.push(purchase);
        } else {
          // Keep the most recent purchase
          if (purchase.datePurchased > existing.datePurchased) {
            const index = acc.indexOf(existing);
            acc[index] = purchase;
          }
        }
        return acc;
      }, [] as Purchase[]);

      setPurchases(uniquePurchases);

      const hasCustomAvatar = uniquePurchases.some(p => p.itemId === 'avatar_custom_photo');
      if (hasCustomAvatar && currentUser) {
        const customUrl = await getCustomAvatar(currentUser.uid);
        setCustomAvatarUrl(customUrl);
      }

      setAchievements(
        generateAchievements(
          computed.totalXP,
          computed.totalSessions,
          computed.longestStreak,
          uniquePurchases.length
        )
      );
    } catch (e) {
      const err = e as FirestoreError;
      console.error('Error fetching collections data:', err);
      setError(err.message || 'Something went wrong loading your data.');
    } finally {
      setLoading(false);
    }
  };

  const generateAchievements = (
    totalXP: number,
    totalSessions: number,
    longestStreak: number,
    totalPurchases: number
  ): Achievement[] => {
    const out: Achievement[] = [];
    const now = new Date();

    // XP gates
    if (totalXP >= 100)
      out.push({
        id: 'first_hundred',
        name: 'First Century',
        description: 'Earned your first 100 XP',
        icon: '💯',
        rarity: 'common',
        unlockedAt: now,
        category: 'Progress',
      });
    if (totalXP >= 500)
      out.push({
        id: 'level_up',
        name: 'Level Up! ',
        description: 'Reached Level 2',
        icon: '⬆️',
        rarity: 'common',
        unlockedAt: now,
        category: 'Progress',
      });
    if (totalXP >= 1000)
      out.push({
        id: 'xp_master',
        name: 'XP Master',
        description: 'Accumulated 1,000 XP',
        icon: '🌟',
        rarity: 'rare',
        unlockedAt: now,
        category: 'Progress',
      });

    // Sessions
    if (totalSessions >= 1)
      out.push({
        id: 'first_session',
        name: 'Getting Started',
        description: 'Completed your first focus session',
        icon: '🎯',
        rarity: 'common',
        unlockedAt: now,
        category: 'Focus',
      });
    if (totalSessions >= 10)
      out.push({
        id: 'dedicated_focuser',
        name: 'Dedicated Focuser',
        description: 'Completed 10 focus sessions',
        icon: '🔥',
        rarity: 'rare',
        unlockedAt: now,
        category: 'Focus',
      });
    if (totalSessions >= 50)
      out.push({
        id: 'focus_veteran',
        name: 'Focus Veteran',
        description: 'Completed 50 focus sessions',
        icon: '🏆',
        rarity: 'epic',
        unlockedAt: now,
        category: 'Focus',
      });

    // Streaks
    if (longestStreak >= 3)
      out.push({
        id: 'streak_starter',
        name: 'Streak Starter',
        description: 'Maintained a 3-day focus streak',
        icon: '🔥',
        rarity: 'common',
        unlockedAt: now,
        category: 'Consistency',
      });
    if (longestStreak >= 7)
      out.push({
        id: 'week_warrior',
        name: 'Week Warrior',
        description: 'Maintained a 7-day focus streak',
        icon: '⚡',
        rarity: 'rare',
        unlockedAt: now,
        category: 'Consistency',
      });
    if (longestStreak >= 30)
      out.push({
        id: 'month_master',
        name: 'Month Master',
        description: 'Maintained a 30-day focus streak',
        icon: '👑',
        rarity: 'legendary',
        unlockedAt: now,
        category: 'Consistency',
      });

    // Collections
    if (totalPurchases >= 1)
      out.push({
        id: 'first_purchase',
        name: 'First Purchase',
        description: 'Made your first marketplace purchase',
        icon: '🛒',
        rarity: 'common',
        unlockedAt: now,
        category: 'Collection',
      });
    if (totalPurchases >= 5)
      out.push({
        id: 'collector',
        name: 'Collector',
        description: 'Purchased 5 items from the marketplace',
        icon: '🎁',
        rarity: 'rare',
        unlockedAt: now,
        category: 'Collection',
      });

    return out;
  };

  useEffect(() => {
    if (isOpen) {
      void fetchCollectionsData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, currentUser?.uid, refreshTrigger]);

  const tabs: { id: ActiveTab; name: string; icon: React.ComponentType<any> }[] = useMemo(
    () => [
      { id: 'overview', name: 'Overview', icon: Target },
      { id: 'achievements', name: 'Achievements', icon: Trophy },
      { id: 'avatars', name: 'Avatars', icon: Star },
      { id: 'backgrounds', name: 'Backgrounds', icon: Sparkles },
    ],
    []
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="glass-card rounded-xl sm:rounded-2xl w-full max-w-6xl h-[95vh] sm:h-[90vh] border border-white/20 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-b border-white/20 p-4 sm:p-6 flex-shrink-0">
          <div className="flex items-center justify-between mb-4 sm:mb-0">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="bg-gradient-to-r from-purple-500 to-pink-600 p-2 sm:p-3 rounded-xl sm:rounded-2xl">
                <Trophy className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
              </div>
              <div>
                <h2 className="text-xl sm:text-3xl font-bold text-white">Collections Room</h2>
                <p className="text-sm sm:text-base text-gray-300">Your achievements, purchases, and progress</p>
              </div>
            </div>

            <button onClick={onClose} className="bg-white/10 hover:bg-white/20 p-2 rounded-lg transition-all">
              <X className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </button>
          </div>

          {/* User Stats Overview */}
          {userStats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 mt-4 sm:mt-6">
              <div className="bg-white/10 rounded-lg sm:rounded-xl p-3 sm:p-4 text-center">
                <div className="text-lg sm:text-2xl font-bold text-white">{userStats.level}</div>
                <div className="text-xs sm:text-sm text-gray-300">Level</div>
              </div>
              <div className="bg-white/10 rounded-lg sm:rounded-xl p-3 sm:p-4 text-center">
                <div className="text-lg sm:text-2xl font-bold text-white">{userStats.totalXP}</div>
                <div className="text-xs sm:text-sm text-gray-300">Total XP</div>
              </div>
              <div className="bg-white/10 rounded-lg sm:rounded-xl p-3 sm:p-4 text-center">
                <div className="text-lg sm:text-2xl font-bold text-white">{userStats.totalSessions}</div>
                <div className="text-xs sm:text-sm text-gray-300">Sessions</div>
              </div>
              <div className="bg-white/10 rounded-lg sm:rounded-xl p-3 sm:p-4 text-center">
                <div className="text-lg sm:text-2xl font-bold text-white">{userStats.longestStreak}</div>
                <div className="text-xs sm:text-sm text-gray-300">Best Streak</div>
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="bg-white/5 border-b border-white/10 p-3 sm:p-4 flex-shrink-0">
          <div className="flex flex-wrap gap-1 sm:gap-2 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const category = tabToCategory(tab.id);
              const count =
                tab.id === 'achievements'
                  ? achievements.length
                  : tab.id === 'overview'
                  ? 0
                  : category
                  ? getPurchasesByCategory(category).length
                  : 0;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 rounded-lg transition-all text-xs sm:text-sm whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-blue-500/30 text-blue-300'
                      : 'bg-white/5 text-gray-300 hover:bg-white/10'
                  }`}
                >
                  <Icon className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">{tab.name}</span>
                  <span className="sm:hidden">{tab.name.slice(0, 3)}</span>
                  {count > 0 && (
                    <span className="bg-white/20 text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full">{count}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
            </div>
          ) : error ? (
            <div className="bg-red-500/10 border border-red-500/30 text-red-200 p-4 rounded-xl">
              {error}
            </div>
          ) : (
            <>
              {/* Overview */}
              {activeTab === 'overview' && (
                <div className="space-y-4 sm:space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                    {/* Recent Achievements */}
                    <div className="bg-white/10 rounded-xl p-4 sm:p-6">
                      <h3 className="text-lg sm:text-xl font-bold text-white mb-3 sm:mb-4 flex items-center gap-2">
                        <Trophy className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-400" />
                        Recent Achievements
                      </h3>
                      <div className="space-y-2 sm:space-y-3">
                        {achievements.slice(0, 3).map((a) => (
                          <div key={a.id} className="flex items-center gap-2 sm:gap-3">
                            <span className="text-lg sm:text-2xl">{a.icon}</span>
                            <div>
                              <div className="font-semibold text-white text-xs sm:text-sm">{a.name}</div>
                              <div className="text-xs text-gray-400">{a.category}</div>
                            </div>
                          </div>
                        ))}
                        {achievements.length === 0 && (
                          <p className="text-gray-400 text-xs sm:text-sm">Complete sessions to unlock achievements!</p>
                        )}
                      </div>
                    </div>

                    {/* Collection Summary */}
                    <div className="bg-white/10 rounded-xl p-4 sm:p-6">
                      <h3 className="text-lg sm:text-xl font-bold text-white mb-3 sm:mb-4 flex items-center gap-2">
                        <ShoppingBag className="h-4 w-4 sm:h-5 sm:w-5 text-purple-400" />
                        Collection Summary
                      </h3>
                      <div className="space-y-1 sm:space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-300">Avatars</span>
                          <span className="text-white">{getPurchasesByCategory('avatar').length}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-300">Backgrounds</span>
                          <span className="text-white">{getPurchasesByCategory('background').length}</span>
                        </div>
                      </div>
                    </div>

                    {/* Progress Stats */}
                    <div className="bg-white/10 rounded-xl p-4 sm:p-6">
                      <h3 className="text-lg sm:text-xl font-bold text-white mb-3 sm:mb-4 flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-green-400" />
                        Progress Stats
                      </h3>
                      {userStats && (
                        <div className="space-y-1 sm:space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-300">Focus Time</span>
                            <span className="text-white">{userStats.totalFocusTime}m</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-300">Current Streak</span>
                            <span className="text-white">{userStats.currentStreak} days</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-300">Member Since</span>
                            <span className="text-white">{userStats.joinDate.toLocaleDateString()}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-300">Total Purchases</span>
                            <span className="text-white">{purchases.length}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Achievements */}
              {activeTab === 'achievements' && (
                <div>
                  <h3 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6">Achievements Unlocked</h3>
                  {achievements.length === 0 ? (
                    <div className="text-center py-8 sm:py-12">
                      <Lock className="h-12 w-12 sm:h-16 sm:w-16 text-gray-400 mx-auto mb-4" />
                      <h4 className="text-lg sm:text-xl font-semibold text-gray-300 mb-2">No Achievements Yet</h4>
                      <p className="text-sm sm:text-base text-gray-400">Complete focus sessions to start unlocking achievements!</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                      {achievements.map((a) => (
                        <div
                          key={a.id}
                          className={`bg-gradient-to-r ${rarityColor(a.rarity)} p-4 sm:p-6 rounded-xl border-2 ${rarityBorder(
                            a.rarity
                          )} shadow-lg`}
                        >
                          <div className="text-center">
                            <div className="text-3xl sm:text-4xl mb-2 sm:mb-3">{a.icon}</div>
                            <h4 className="text-base sm:text-lg font-bold text-white mb-1 sm:mb-2">{a.name}</h4>
                            <p className="text-xs sm:text-sm text-gray-200 mb-2 sm:mb-3">{a.description}</p>
                            <div className="flex items-center justify-between">
                              <span className="text-xs bg-white/20 px-2 py-1 rounded-full text-white">{a.category}</span>
                              <span className="text-xs text-gray-200 capitalize">{a.rarity}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Category Tabs */}
              {(activeTab === 'avatars' ||
                activeTab === 'backgrounds' ||
                activeTab === 'powerups') && (
                <div>
                  <h3 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6 capitalize">My {activeTab}</h3>
                  {(() => {
                    const category = tabToCategory(activeTab);
                    if (!category) return null;
                    const items = getPurchasesByCategory(category);
                    if (items.length === 0) {
                      return (
                        <div className="text-center py-8 sm:py-12">
                          <ShoppingBag className="h-12 w-12 sm:h-16 sm:w-16 text-gray-400 mx-auto mb-4" />
                          <h4 className="text-lg sm:text-xl font-semibold text-gray-300 mb-2">No {activeTab} Yet</h4>
                          <p className="text-sm sm:text-base text-gray-400">Visit the marketplace to purchase {activeTab}!</p>
                        </div>
                      );
                    }
                    return (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                        {items.map((purchase) => {
                          const item = getItemDetails(purchase.itemId, purchase.category);
                          const isBackground = purchase.category === 'background';
                          const isAvatar = purchase.category === 'avatar';
                          const isActive = isAvatar
                            ? activeAvatar === purchase.itemId
                            : isBackground
                            ? activeBackgroundId === purchase.itemId
                            : false;

                          // Check if level requirement is met for level reward avatars
                          const levelRewardAvatars: Record<string, number> = {
                            'avatar_star': 5,
                            'avatar_lightning': 10,
                            'avatar_gem': 15,
                            'avatar_trophy': 20,
                            'avatar_crown': 25,
                          };
                          const requiredLevel = levelRewardAvatars[purchase.itemId];
                          const canEquip = !requiredLevel || userLevel >= requiredLevel;

                          return (
                            <div key={purchase.itemId} className="bg-white/10 rounded-xl p-3 sm:p-4 border border-white/20 hover:bg-white/15 transition-all">
                              {isBackground && item?.preview ? (
                                <div className="mb-3 sm:mb-4">
                                  <div
                                    className="aspect-video rounded-lg overflow-hidden cursor-pointer group"
                                    onClick={() => setSelectedBackground(item.preview!)}
                                  >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={item.preview} alt={item.name} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                                  </div>
                                </div>
                              ) : isAvatar && purchase.itemId === 'avatar_custom_photo' && customAvatarUrl ? (
                                <div className="mb-3 sm:mb-4">
                                  <div className="aspect-square rounded-lg overflow-hidden border-2 border-purple-400">
                                    <img src={customAvatarUrl} alt="Custom Avatar" className="w-full h-full object-cover" />
                                  </div>
                                </div>
                              ) : isAvatar ? (
                                <div className="text-center mb-3 sm:mb-4">
                                  <div className="text-4xl sm:text-6xl mb-2">{item.emoji}</div>
                                </div>
                              ) : (
                                <div className="text-center mb-3 sm:mb-4">
                                  <div className="text-3xl sm:text-4xl mb-2">{item.emoji}</div>
                                </div>
                              )}

                              <div className="text-center">
                                <h4 className="font-bold text-white mb-1 text-sm sm:text-base">{item.name}</h4>
                                <p className="text-xs sm:text-sm text-gray-300 mb-2">Purchased {purchase.datePurchased.toLocaleDateString()}</p>
                                <div className="flex items-center justify-center gap-2 mb-2">
                                  <div className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded-full">{purchase.xpSpent} XP</div>
                                  {isActive && (
                                    <div className="text-xs bg-yellow-500/30 text-yellow-300 px-2 py-1 rounded-full font-semibold">Active</div>
                                  )}
                                </div>

                                {/* Equip Button */}
                                {(isAvatar || isBackground) && !isActive && (
                                  <button
                                    onClick={() => isAvatar ? handleEquipAvatar(purchase.itemId) : handleEquipBackground(purchase.itemId)}
                                    disabled={isAvatar && !canEquip}
                                    className={`w-full px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                                      isAvatar && !canEquip
                                        ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                        : 'bg-blue-500 hover:bg-blue-600 text-white'
                                    }`}
                                    title={isAvatar && !canEquip ? `Reach Level ${requiredLevel} to equip` : 'Equip this item'}
                                  >
                                    {isAvatar && !canEquip ? `🔒 Level ${requiredLevel}` : 'Equip'}
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Background Preview Modal */}
      {selectedBackground && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-60 flex items-center justify-center p-4">
          <div className="glass-card rounded-xl sm:rounded-2xl p-4 sm:p-6 max-w-4xl w-full border border-white/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg sm:text-xl font-bold text-white">Background Preview</h3>
              <button onClick={() => setSelectedBackground(null)} className="text-gray-400 hover:text-white text-xl sm:text-2xl">
                ×
              </button>
            </div>
            <div className="aspect-video rounded-xl overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={selectedBackground} alt="Background preview" className="w-full h-full object-cover" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
