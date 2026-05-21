import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { collection, query, where, getDocs, doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { User } from 'lucide-react';
import { getCustomAvatar } from '../../services/supabaseAvatarService';

interface UserAvatarProps {
  refreshTrigger?: number;
  size?: 'small' | 'medium' | 'large';
}

const avatarItems = {
  'avatar_rocket': '🚀',
  'avatar_ninja': '🥷',
  'avatar_wizard': '🧙‍♂️',
  'avatar_robot': '🤖',
  'avatar_crown': '👑',
  'avatar_fire': '🔥',
  'avatar_star': '⭐',
  'avatar_lightning': '⚡',
  'avatar_gem': '💎',
  'avatar_trophy': '🏆',
  'avatar_custom_photo': '📸'
};

export function UserAvatar({ refreshTrigger = 0, size = 'medium' }: UserAvatarProps) {
  const [currentAvatar, setCurrentAvatar] = useState<string | null>(null);
  const [customAvatarUrl, setCustomAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const { currentUser } = useAuth();

  const sizeClasses = {
    small: 'w-8 h-8 text-lg',
    medium: 'w-12 h-12 text-2xl',
    large: 'w-16 h-16 text-3xl'
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

          if (profileData.activeAvatar) {
            setCurrentAvatar(profileData.activeAvatar);

            if (profileData.activeAvatar === 'avatar_custom_photo') {
              const customUrl = profileData.customAvatarUrl || await getCustomAvatar(currentUser.uid);
              setCustomAvatarUrl(customUrl);
            } else {
              setCustomAvatarUrl(null);
            }

            setLoading(false);
            return;
          }
        }

        const purchasesQuery = query(
          collection(db, 'userProfiles', currentUser.uid, 'purchases'),
          where('category', '==', 'avatar')
        );
        const purchasesSnapshot = await getDocs(purchasesQuery);

        let latestAvatar = null;
        let latestDate = null;

        purchasesSnapshot.forEach((doc) => {
          const data = doc.data();
          const purchaseDate = data.datePurchased.toDate();

          if (!latestDate || purchaseDate > latestDate) {
            latestDate = purchaseDate;
            latestAvatar = data.itemId;
          }
        });

        if (latestAvatar) {
          setCurrentAvatar(latestAvatar);

          if (latestAvatar === 'avatar_custom_photo') {
            const customUrl = await getCustomAvatar(currentUser.uid);
            setCustomAvatarUrl(customUrl);
          } else {
            setCustomAvatarUrl(null);
          }
        } else {
          setCurrentAvatar(null);
          setCustomAvatarUrl(null);
        }
      } catch (error) {
        console.error('Error fetching user avatar:', error);
        setCurrentAvatar(null);
        setCustomAvatarUrl(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [currentUser, refreshTrigger]);

  if (loading) {
    return (
      <div className={`${sizeClasses[size]} bg-white/10 rounded-full flex items-center justify-center animate-pulse`}>
        <div className="w-4 h-4 bg-white/20 rounded animate-shimmer"></div>
      </div>
    );
  }

  if (currentAvatar === 'avatar_custom_photo' && customAvatarUrl) {
    return (
      <div
        className={`${sizeClasses[size]} rounded-full shadow-lg border-2 border-white/20 transition-all duration-300 hover:scale-110 hover-glow cursor-pointer animate-bounce-in ${isHovered ? 'animate-float' : ''} overflow-hidden`}
        title="Your Custom Avatar - Click to view collections"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <img
          src={customAvatarUrl}
          alt="Custom Avatar"
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  if (currentAvatar && avatarItems[currentAvatar as keyof typeof avatarItems]) {
    return (
      <div
        className={`${sizeClasses[size]} bg-gradient-to-r from-violet-600 to-indigo-600 rounded-full flex items-center justify-center shadow-lg border-2 border-white/20 transition-all duration-300 hover:scale-110 hover-glow cursor-pointer animate-bounce-in ${isHovered ? 'animate-float' : ''}`}
        title="Your Avatar - Click to view collections"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <span className="filter drop-shadow-sm transition-transform duration-300">
          {avatarItems[currentAvatar as keyof typeof avatarItems]}
        </span>
      </div>
    );
  }

  // Default avatar if no avatar purchased
  return (
    <div 
      className={`${sizeClasses[size]} bg-gradient-to-r from-gray-500 to-gray-600 rounded-full flex items-center justify-center shadow-lg border-2 border-white/20 transition-all duration-300 hover:scale-110 hover-glow cursor-pointer animate-bounce-in ${isHovered ? 'animate-float' : ''}`}
      title="Default Avatar - Click to view collections"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <User className={`${size === 'small' ? 'h-4 w-4' : size === 'medium' ? 'h-6 w-6' : 'h-8 w-8'} text-white transition-transform duration-300`} />
    </div>
  );
}