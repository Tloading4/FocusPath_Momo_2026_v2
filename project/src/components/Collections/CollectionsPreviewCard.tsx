import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { collection, query, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Trophy, Star, Palette, Zap, Eye, RefreshCw, Lock } from 'lucide-react';

interface Purchase {
  id: string;
  itemId: string;
  category: 'avatar' | 'background' | 'powerup';
  datePurchased: Date;
}

interface Achievement {
  id: string;
  name: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

interface CollectionsPreviewCardProps {
  refreshTrigger?: number;
  onOpenCollections: () => void;
}

export function CollectionsPreviewCard({ refreshTrigger = 0, onOpenCollections }: CollectionsPreviewCardProps) {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const { currentUser } = useAuth();

  const generateAchievements = (totalXP: number, totalSessions: number, longestStreak: number, totalPurchases: number): Achievement[] => {
    const achievements: Achievement[] = [];

    // XP achievements
    if (totalXP >= 100) achievements.push({ id: 'first_hundred', name: 'First Century', icon: '💯', rarity: 'common' });
    if (totalXP >= 500) achievements.push({ id: 'level_up', name: 'Level Up!', icon: '⬆️', rarity: 'common' });
    if (totalXP >= 1000) achievements.push({ id: 'xp_master', name: 'XP Master', icon: '🌟', rarity: 'rare' });

    // Session achievements
    if (totalSessions >= 1) achievements.push({ id: 'first_session', name: 'Getting Started', icon: '🎯', rarity: 'common' });
    if (totalSessions >= 10) achievements.push({ id: 'dedicated_focuser', name: 'Dedicated Focuser', icon: '🔥', rarity: 'rare' });
    if (totalSessions >= 50) achievements.push({ id: 'focus_veteran', name: 'Focus Veteran', icon: '🏆', rarity: 'epic' });

    // Streak achievements
    if (longestStreak >= 3) achievements.push({ id: 'streak_starter', name: 'Streak Starter', icon: '🔥', rarity: 'common' });
    if (longestStreak >= 7) achievements.push({ id: 'week_warrior', name: 'Week Warrior', icon: '⚡', rarity: 'rare' });
    if (longestStreak >= 30) achievements.push({ id: 'month_master', name: 'Month Master', icon: '👑', rarity: 'legendary' });

    // Collection achievements
    if (totalPurchases >= 1) achievements.push({ id: 'first_purchase', name: 'First Purchase', icon: '🛒', rarity: 'common' });
    if (totalPurchases >= 5) achievements.push({ id: 'collector', name: 'Collector', icon: '🎁', rarity: 'rare' });

    return achievements;
  };

  const fetchCollectionsData = async () => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    try {
      setError(null);

      // Fetch purchases
      const purchasesQuery = query(collection(db, 'userProfiles', currentUser.uid, 'purchases'));
      const purchasesSnapshot = await getDocs(purchasesQuery);
      const userPurchases: Purchase[] = purchasesSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          itemId: data.itemId,
          category: data.category,
          datePurchased: data.datePurchased.toDate()
        };
      });

      // Fetch user stats for achievements
      const profileDoc = await getDoc(doc(db, 'userProfiles', currentUser.uid));
      const profileData = profileDoc.exists() ? profileDoc.data() : {};
      const totalXP = profileData.totalXP || 0;

      const sessionsQuery = query(collection(db, 'userProfiles', currentUser.uid, 'sessions'));
      const sessionsSnapshot = await getDocs(sessionsQuery);
      const totalSessions = sessionsSnapshot.docs.filter(doc => {
        const data = doc.data();
        return data.completed !== false;
      }).length;

      const streakDoc = await getDoc(doc(db, 'streaks', currentUser.uid));
      const streakData = streakDoc.exists() ? streakDoc.data() : {};
      const longestStreak = streakData.longestStreak || 0;

      // Generate achievements
      const userAchievements = generateAchievements(totalXP, totalSessions, longestStreak, userPurchases.length);

      setPurchases(userPurchases);
      setAchievements(userAchievements);
    } catch (error) {
      console.error('Error fetching collections data:', error);
      setError('Failed to load collections data');
    } finally {
      setLoading(false);
      setTimeout(() => setIsVisible(true), 100);
    }
  };

  useEffect(() => {
    fetchCollectionsData();
  }, [currentUser, refreshTrigger]);

  const getPurchasesByCategory = (category: 'avatar' | 'background' | 'powerup') => {
    return purchases.filter(p => p.category === category);
  };

  const getAchievementsByRarity = (rarity: 'common' | 'rare' | 'epic' | 'legendary') => {
    return achievements.filter(a => a.rarity === rarity);
  };

  const getLatestPurchases = () => {
    return purchases
      .sort((a, b) => b.datePurchased.getTime() - a.datePurchased.getTime())
      .slice(0, 3);
  };

  const getLatestAchievements = () => {
    return achievements.slice(-3);
  };

  if (loading) {
    return (
      <div className="glass-card rounded-2xl p-6 shadow-2xl animate-fade-in h-full flex flex-col">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-white/20 rounded animate-shimmer"></div>
          <div className="h-4 bg-white/20 rounded animate-shimmer"></div>
          <div className="h-4 bg-white/20 rounded animate-shimmer"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card rounded-2xl p-6 shadow-2xl animate-fade-in h-full flex flex-col">
        <div className="text-center text-red-300">
          <Trophy className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm mb-2">{error}</p>
          <button
            onClick={fetchCollectionsData}
            className="text-xs bg-red-500/20 hover:bg-red-500/30 px-3 py-1 rounded-lg transition-all"
          >
            <RefreshCw className="h-3 w-3 inline mr-1" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`glass-card rounded-2xl p-3 shadow-2xl hover-lift h-full flex flex-col transition-all duration-500 cursor-pointer ${isVisible ? 'animate-slide-up' : 'opacity-0 translate-y-8'}`} onClick={onOpenCollections}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-r from-purple-500 to-pink-600 p-1.5 rounded-lg animate-pulse-glow">
            <Trophy className="h-4 w-4 text-white animate-float" />
          </div>
          <div className="animate-slide-right">
            <h2 className="text-base font-bold text-white">Collections</h2>
            <p className="text-xs text-gray-300">Your achievements & items</p>
          </div>
        </div>
        
        <button className="bg-white/10 hover:bg-white/20 p-1.5 rounded-lg transition-all transform hover:scale-110 hover-bounce btn-press">
          <Eye className="h-4 w-4 text-white" />
        </button>
      </div>

      {/* Collection Summary */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="rounded-xl p-3 text-center hover-glow transition-all animate-scale-in card-stagger-1">
          <div className="text-lg mb-1 animate-bounce-in">🏆</div>
          <div className="text-base font-bold text-white animate-number-count">{achievements.length}</div>
          <div className="text-sm text-gray-300">Achievements</div>
        </div>
        <div className="rounded-xl p-3 text-center hover-glow transition-all animate-scale-in card-stagger-2">
          <div className="text-lg mb-1 animate-bounce-in">🎁</div>
          <div className="text-base font-bold text-white animate-number-count">{purchases.length}</div>
          <div className="text-sm text-gray-300">Items Owned</div>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="space-y-1 mb-3 animate-fade-in flex-grow">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 text-blue-400" />
            <span className="text-gray-300">Avatars</span>
          </div>
          <span className="text-white font-semibold">{getPurchasesByCategory('avatar').length}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Palette className="h-4 w-4 text-green-400" />
            <span className="text-gray-300">Backgrounds</span>
          </div>
          <span className="text-white font-semibold">{getPurchasesByCategory('background').length}</span>
        </div>
      </div>

      {/* Recent Items Preview */}
      {purchases.length > 0 ? (
        <div className="animate-slide-up mb-2">
          <h4 className="text-xs font-semibold text-gray-300 mb-2">Recent Purchases</h4>
          <div className="flex gap-2">
            {getLatestPurchases().map((purchase, index) => {
              const avatarItems = {
                'avatar_rocket': '🚀', 'avatar_ninja': '🥷', 'avatar_wizard': '🧙‍♂️',
                'avatar_robot': '🤖', 'avatar_crown': '👑', 'avatar_fire': '🔥',
                'avatar_star': '⭐', 'avatar_lightning': '⚡', 'avatar_gem': '💎', 'avatar_trophy': '🏆'
              };
              const backgroundItems = {
                'bg_mountain_peaks': '🏔️', 'bg_ocean_waves': '🌊', 'bg_forest_path': '🌲',
                'bg_desert_dunes': '🏜️', 'bg_northern_lights': '🌌', 'bg_cherry_blossoms': '🌸',
                'bg_city_skyline': '🏙️', 'bg_lavender_fields': '💜'
              };
              const powerUpItems = {
                'powerup_double_xp': '⚡', 'powerup_streak_shield': '🛡️', 'powerup_focus_enhancer': '🎯'
              };
              
              const allItems = { ...avatarItems, ...backgroundItems, ...powerUpItems };
              const icon = allItems[purchase.itemId as keyof typeof allItems] || '❓';
              
              return (
                <div
                  key={purchase.id}
                  className={`w-6 h-6 bg-white/10 rounded-lg flex items-center justify-center text-xs hover:bg-white/20 transition-all animate-scale-in card-stagger-${index + 1}`}
                  title={`${purchase.category} purchased ${purchase.datePurchased.toLocaleDateString()}`}
                >
                  {icon}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="text-center py-2 animate-fade-in mb-2">
          <Lock className="h-4 w-4 text-gray-400 mx-auto mb-1 animate-float" />
          <p className="text-xs text-gray-400">No items collected yet</p>
        </div>
      )}

      {/* Recent Achievements Preview */}
      {achievements.length > 0 && (
        <div className="pt-2 border-t border-white/20 animate-slide-up">
          <h4 className="text-xs font-semibold text-gray-300 mb-2">Latest Achievements</h4>
          <div className="flex gap-2">
            {getLatestAchievements().map((achievement, index) => (
              <div
                key={achievement.id}
                className={`w-6 h-6 bg-gradient-to-r rounded-lg flex items-center justify-center text-xs hover:scale-110 transition-all animate-scale-in card-stagger-${index + 1} ${
                  achievement.rarity === 'legendary' ? 'from-yellow-500 to-orange-600' :
                  achievement.rarity === 'epic' ? 'from-purple-500 to-pink-600' :
                  achievement.rarity === 'rare' ? 'from-blue-500 to-indigo-600' :
                  'from-gray-500 to-gray-600'
                }`}
                title={`${achievement.name} (${achievement.rarity})`}
              >
                {achievement.icon}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-2 pt-2 border-t border-white/20 animate-slide-up">
        <p className="text-xs text-gray-400 text-center animate-fade-in">
          💡 Click to explore your full collections room
        </p>
      </div>

    </div>
  );
}