import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  collection,
  query,
  getDocs,
  addDoc,
  doc,
  onSnapshot,
  setDoc,
  increment,
} from 'firebase/firestore';
import { db } from '../../firebase';
import {
  ShoppingBag,
  RefreshCw,
  Check,
  Image,
  Camera,
  Lock
} from 'lucide-react';
import { PhotoUploadModal } from './PhotoUploadModal';
import { hasCustomAvatar } from '../../services/supabaseAvatarService';
import { LevelingService } from '../../services/LevelingService';

/* -----------------------------------------------------------
   TYPES
------------------------------------------------------------*/
interface MarketplaceItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: 'avatar' | 'background';
  icon: string;
  preview?: string;
  levelRequired?: number;
  isLevelReward?: boolean;
}

interface Purchase {
  id: string;
  itemId: string;
  itemName: string;
  xpSpent: number;
  datePurchased: Date;
}

interface MarketplaceProps {
  refreshTrigger?: number;
  onMarketplaceChange?: () => void;
}

/* -----------------------------------------------------------
   MARKETPLACE ITEMS (FULL + FIXED)
------------------------------------------------------------*/
const marketplaceItems: MarketplaceItem[] = [
  // ⭐ FREE DEFAULT BACKGROUND
  {
    id: 'bg_default_classic',
    name: 'Default Background',
    description: 'Christmas theme',
    price: 0,
    category: 'background',
    icon: '✨',
    preview: 'https://images.pexels.com/photos/1257860/pexels-photo-1257860.jpeg'
  },

  // AVATARS (NORMAL)
  { id: 'avatar_rocket', name: 'Rocket Avatar', description: 'Blast off to productivity!', price: 200, category: 'avatar', icon: '🚀' },
  { id: 'avatar_ninja', name: 'Ninja Avatar', description: 'Silent focus master', price: 300, category: 'avatar', icon: '🥷' },
  { id: 'avatar_wizard', name: 'Wizard Avatar', description: 'Magical productivity powers', price: 400, category: 'avatar', icon: '🧙‍♂️' },
  { id: 'avatar_robot', name: 'Robot Avatar', description: 'Efficient and precise', price: 350, category: 'avatar', icon: '🤖' },
  { id: 'avatar_fire', name: 'Fire Avatar', description: 'Burning with determination', price: 450, category: 'avatar', icon: '🔥' },

  // CUSTOM UPLOAD AVATAR
  {
    id: 'avatar_custom_photo',
    name: 'Custom Photo Avatar',
    description: 'Upload your own photo as your avatar!',
    price: 500,
    category: 'avatar',
    icon: '📸',
    levelRequired: 8,
    isLevelReward: false
  },

  // LEVEL REWARD AVATARS
  { id: 'avatar_star', name: 'Star Avatar', description: 'Level 5 Reward – Shining achievement!', price: 0, category: 'avatar', icon: '⭐', levelRequired: 5, isLevelReward: true },
  { id: 'avatar_lightning', name: 'Lightning Avatar', description: 'Level 10 Reward – Ultimate focus!', price: 0, category: 'avatar', icon: '⚡', levelRequired: 10, isLevelReward: true },
  { id: 'avatar_gem', name: 'Gem Avatar', description: 'Level 15 Reward – Precious dedication!', price: 0, category: 'avatar', icon: '💎', levelRequired: 15, isLevelReward: true },
  { id: 'avatar_trophy', name: 'Trophy Avatar', description: 'Level 20 Reward – Champion status!', price: 0, category: 'avatar', icon: '🏆', levelRequired: 20, isLevelReward: true },
  { id: 'avatar_crown', name: 'Crown Avatar', description: 'Level 25 Reward – Royal mastery!', price: 0, category: 'avatar', icon: '👑', levelRequired: 25, isLevelReward: true },

  // BACKGROUNDS (PREMIUM)
  { id: 'bg_mountain_peaks', name: 'Mountain Peaks', description: 'Majestic snow-capped mountains', price: 300, category: 'background', icon: '🏔️', preview: 'https://images.pexels.com/photos/1366919/pexels-photo-1366919.jpeg' },
  { id: 'bg_ocean_waves', name: 'Ocean Waves', description: 'Peaceful blue water', price: 250, category: 'background', icon: '🌊', preview: 'https://images.pexels.com/photos/1001682/pexels-photo-1001682.jpeg' },
  { id: 'bg_forest_path', name: 'Forest Path', description: 'Serene woodland trail', price: 280, category: 'background', icon: '🌲', preview: 'https://images.pexels.com/photos/1496373/pexels-photo-1496373.jpeg' },
  { id: 'bg_desert_dunes', name: 'Desert Dunes', description: 'Golden sand dunes', price: 320, category: 'background', icon: '🏜️', preview: 'https://wallpaperaccess.com/full/100630.jpg' },
  { id: 'bg_northern_lights', name: 'Northern Lights', description: 'Aurora borealis sky', price: 450, category: 'background', icon: '🌌', preview: 'https://images.pexels.com/photos/1933239/pexels-photo-1933239.jpeg' },
  { id: 'bg_cherry_blossoms', name: 'Cherry Blossoms', description: 'Pink sakura trees', price: 350, category: 'background', icon: '🌸', preview: 'https://static.vecteezy.com/system/resources/previews/036/105/188/large_2x/ai-generated-beautiful-japanese-garden-with-cherry-blossom-and-pagoda-ai-generated-free-photo.jpg' },
  { id: 'bg_city_skyline', name: 'City Skyline', description: 'City at twilight', price: 380, category: 'background', icon: '🏙️', preview: 'https://wallpapercave.com/wp/wp2329756.jpg' },
  { id: 'bg_lavender_fields', name: 'Lavender Fields', description: 'Purple lavender in France', price: 330, category: 'background', icon: '💜', preview: 'https://images.pexels.com/photos/1166209/pexels-photo-1166209.jpeg' },
  { id: 'bg_tropical_beach', name: 'Tropical Beach', description: 'Perfect white sand', price: 280, category: 'background', icon: '🏝️', preview: 'https://images.pexels.com/photos/457882/pexels-photo-457882.jpeg' },
  { id: 'bg_starry_night', name: 'Starry Night', description: 'Milky Way sky', price: 400, category: 'background', icon: '✨', preview: 'https://images.pexels.com/photos/1169754/pexels-photo-1169754.jpeg' },
  { id: 'bg_autumn_forest', name: 'Autumn Forest', description: 'Golden fall leaves', price: 300, category: 'background', icon: '🍂', preview: 'https://images.pexels.com/photos/33109/fall-autumn-red-season.jpg' },
  { id: 'bg_zen_garden', name: 'Zen Garden', description: 'Japanese rock garden', price: 350, category: 'background', icon: '🪨', preview: 'http://getwallpapers.com/wallpaper/full/5/3/6/1077061-download-japanese-garden-wallpapers-1920x1200-screen.jpg' },
  { id: 'bg_modern_workspace', name: 'Modern Workspace', description: 'Minimal office desk', price: 320, category: 'background', icon: '💼', preview: 'https://static.vecteezy.com/system/resources/previews/014/868/436/non_2x/top-view-of-modern-business-office-workspace-background-flat-illustration-of-office-desk-with-laptop-digital-devices-and-notepad-vector.jpg' },
  { id: 'bg_sunset_mountains', name: 'Sunset Mountains', description: 'Orange sunset peaks', price: 380, category: 'background', icon: '🌄', preview: 'https://images.pexels.com/photos/1624438/pexels-photo-1624438.jpeg' },
  { id: 'bg_misty_lake', name: 'Misty Lake', description: 'Foggy still water', price: 290, category: 'background', icon: '🌫️', preview: 'https://applescoop.org/image/wallpapers/mac/mountain-clouds-night-lake-digital-art-scenery-4k-wallpaper-intense-vibrant-colors-14-11-2024-1731623822-hd-wallpaper.jpg' },
  { id: 'bg_gradient_abstract', name: 'Gradient Abstract', description: 'Colorful gradient art', price: 260, category: 'background', icon: '🎨', preview: 'https://png.pngtree.com/thumb_back/fh260/background/20231206/pngtree-glowing-abstract-gradient-texture-image_13823746.png' },
];

/* -----------------------------------------------------------
   MARKETPLACE COMPONENT
------------------------------------------------------------*/
export function Marketplace({ refreshTrigger = 0, onMarketplaceChange }: MarketplaceProps) {
  const { currentUser } = useAuth();

  const [marketplaceXP, setMarketplaceXP] = useState(0);
  const [totalXP, setTotalXP] = useState(0);
  const [userLevel, setUserLevel] = useState(1);
  const [activeBackground, setActiveBackground] = useState<string | null>(null);
  const [activeAvatar, setActiveAvatar] = useState<string | null>(null);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [previewBackground, setPreviewBackground] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [hasUploadedPhoto, setHasUploadedPhoto] = useState(false);
  const [showPhotoUpload, setShowPhotoUpload] = useState(false);
  const [loading, setLoading] = useState(true);
  const [purchaseLoading, setPurchaseLoading] = useState<string | null>(null);

  /* -----------------------------------------------------------
     LOADING USER DATA
  ------------------------------------------------------------*/
  const fetchUserData = async () => {
    if (!currentUser) return;

    const profileRef = doc(db, 'userProfiles', currentUser.uid);

    const unsubscribe = onSnapshot(profileRef, async (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const total = data.totalXP || 0;
        const coins = data.marketplaceXP || 0;

        setTotalXP(total);
        setMarketplaceXP(coins);
        setUserLevel(LevelingService.getLevelFromXP(total));
        setActiveBackground(data.activeBackground || null);
        setActiveAvatar(data.activeAvatar || null);

        const hasPhoto = await hasCustomAvatar(currentUser.uid);
        setHasUploadedPhoto(hasPhoto);
      }
    });

    // Load purchase history
    const purchSnap = await getDocs(collection(db, 'userProfiles', currentUser.uid, 'purchases'));
    const loadedPurchases: Purchase[] = purchSnap.docs.map(d => ({
      id: d.id,
      itemId: d.data().itemId,
      itemName: d.data().itemName,
      xpSpent: d.data().xpSpent,
      datePurchased: d.data().datePurchased.toDate(),
    }));

    // Deduplicate purchases by itemId, keeping only the most recent purchase
    const uniquePurchases = loadedPurchases.reduce((acc, purchase) => {
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

    setLoading(false);
    return unsubscribe;
  };

  useEffect(() => {
    let unsub: any;
    (async () => {
      unsub = await fetchUserData();
    })();
    return () => unsub && unsub();
  }, [currentUser, refreshTrigger]);

  /* -----------------------------------------------------------
     EQUIP AVATAR
  ------------------------------------------------------------*/
  const handleEquipAvatar = async (id: string) => {
    if (!currentUser) return;

    await setDoc(doc(db, 'userProfiles', currentUser.uid), {
      activeAvatar: id,
      lastUpdated: new Date()
    }, { merge: true });

    setActiveAvatar(id);
    onMarketplaceChange?.();
  };

  /* -----------------------------------------------------------
     EQUIP BACKGROUND
  ------------------------------------------------------------*/
  const handleEquipBackground = async (id: string) => {
    if (!currentUser) return;

    await setDoc(doc(db, 'userProfiles', currentUser.uid), {
      activeBackground: id,
      lastUpdated: new Date()
    }, { merge: true });

    setActiveBackground(id);
    onMarketplaceChange?.();
  };

  /* -----------------------------------------------------------
     PURCHASE LOGIC
  ------------------------------------------------------------*/
  const handlePurchase = async (item: MarketplaceItem) => {
    if (!currentUser) return;

    const unlocked = purchases.some(p => p.itemId === item.id);

    if (unlocked) return;

    if (item.isLevelReward && userLevel < (item.levelRequired || 0)) {
      alert(`🔒 Reach level ${item.levelRequired} to claim this reward!`);
      return;
    }

    if (!item.isLevelReward && marketplaceXP < item.price) {
      alert('Not enough coins.');
      return;
    }

    setPurchaseLoading(item.id);

    try {
      // Save purchase record
      await addDoc(collection(db, 'userProfiles', currentUser.uid, 'purchases'), {
        itemId: item.id,
        itemName: item.name,
        xpSpent: item.price,
        datePurchased: new Date(),
        category: item.category,
      });

      const profileRef = doc(db, 'userProfiles', currentUser.uid);

      // Deduct coins
      if (!item.isLevelReward && item.price > 0) {
        await setDoc(profileRef, {
          marketplaceXP: increment(-item.price)
        }, { merge: true });
      }

      // Auto-equip background
      if (item.category === 'background') {
        await handleEquipBackground(item.id);
      }

      // If custom avatar photo
      if (item.id === 'avatar_custom_photo') {
        setShowPhotoUpload(true);
      }

      alert(item.isLevelReward ? '🎁 Reward claimed!' : '✨ Purchase successful!');

      // Reload purchases to update UI
      const purchSnap = await getDocs(collection(db, 'userProfiles', currentUser.uid, 'purchases'));
      const loadedPurchases: Purchase[] = purchSnap.docs.map(d => ({
        id: d.id,
        itemId: d.data().itemId,
        itemName: d.data().itemName,
        xpSpent: d.data().xpSpent,
        datePurchased: d.data().datePurchased.toDate(),
      }));

      // Deduplicate purchases by itemId, keeping only the most recent purchase
      const uniquePurchases = loadedPurchases.reduce((acc, purchase) => {
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
    } catch (err) {
      console.error(err);
      alert('Purchase failed.');
    }

    setPurchaseLoading(null);
  };

  /* -----------------------------------------------------------
     FILTER ITEMS
  ------------------------------------------------------------*/
  const filteredItems =
    selectedCategory === 'all'
      ? marketplaceItems
      : marketplaceItems.filter(item => item.category === selectedCategory);

  if (loading) return <div>Loading...</div>;

  /* -----------------------------------------------------------
     UI
  ------------------------------------------------------------*/
  return (
    <div className="space-y-8">

      {/* HEADER */}
      <div className="flex justify-between items-center bg-white/10 p-6 rounded-xl">
        <div className="flex items-center gap-4">
          <ShoppingBag className="h-6 w-6 text-white" />
          <h2 className="text-xl text-white">Coin Marketplace</h2>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right">
            <div className="text-3xl font-bold text-white">{marketplaceXP}</div>
            <div className="text-gray-300 text-sm">Coins</div>
          </div>

          <div className="text-right">
            <div className="text-2xl font-bold text-blue-300">{totalXP}</div>
            <div className="text-gray-300 text-sm">Total XP</div>
          </div>

          <div className="text-right">
            <div className="text-2xl font-bold text-yellow-300">Level {userLevel}</div>
            <div className="text-gray-300 text-sm">Current Level</div>
          </div>

          <button onClick={fetchUserData}>
            <RefreshCw className="text-gray-300" />
          </button>
        </div>
      </div>

      {/* FILTERS */}
      <div className="flex gap-2">
        {['all', 'avatar', 'background'].map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2 rounded ${
              selectedCategory === cat ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-300'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* PREVIEW MODAL */}
      {previewBackground && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-white/10 p-6 rounded-xl">
            <button className="float-right" onClick={() => setPreviewBackground(null)}>×</button>
            <img src={previewBackground} className="rounded-lg max-h-80" />
          </div>
        </div>
      )}

      {/* ITEMS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredItems.map(item => {
          const unlocked = purchases.some(p => p.itemId === item.id);
          const isAvatar = item.category === 'avatar';
          const isBackground = item.category === 'background';
          const isActiveBg = isBackground && activeBackground === item.id;
          const isActiveAvatar = isAvatar && activeAvatar === item.id;
          const meetsLevelRequirement = !item.levelRequired || userLevel >= item.levelRequired;
          const isLocked = !meetsLevelRequirement && !unlocked;

          return (
            <div
              key={item.id}
              className={`p-6 rounded-xl border transition-all ${
                isLocked
                  ? 'border-gray-700 bg-gray-900/50 opacity-60'
                  : isActiveBg || isActiveAvatar
                    ? 'border-green-400 bg-green-500/10 hover:scale-105'
                    : 'border-gray-600 bg-white/10 hover:scale-105'
              }`}
            >
              <div className="text-center">
                <div className="relative inline-block">
                  <div className="text-4xl mb-2">{item.icon}</div>
                  {isLocked && (
                    <div className="absolute -top-1 -right-1 bg-red-500 rounded-full p-1">
                      <Lock className="h-4 w-4 text-white" />
                    </div>
                  )}
                </div>
                <h3 className="text-white text-lg font-semibold">{item.name}</h3>
                <p className="text-gray-300 text-sm mb-2">{item.description}</p>

                {item.levelRequired && (
                  <div className={`text-xs font-semibold mb-2 ${meetsLevelRequirement ? 'text-green-400' : 'text-red-400'}`}>
                    {meetsLevelRequirement ? `✓ Level ${item.levelRequired}` : `🔒 Requires Level ${item.levelRequired}`}
                  </div>
                )}

                {item.preview && isBackground && (
                  <button
                    onClick={() => setPreviewBackground(item.preview!)}
                    className="text-blue-400 underline text-sm flex gap-1 justify-center mb-2"
                  >
                    <Image className="h-3 w-3" /> Preview
                  </button>
                )}
              </div>

              <div className="mt-4">

                {/* PRICE */}
                <div className="text-xl font-bold text-white">
                  {item.isLevelReward ? 'FREE REWARD' : `${item.price} Coins`}
                </div>

                {/* OWNED */}
                {unlocked ? (
                  <div className="mt-4 space-y-2">

                    <button className="w-full px-4 py-2 bg-green-500 text-white rounded-lg flex justify-center gap-2">
                      <Check className="h-4 w-4" />
                      Owned
                    </button>

                    {/* EQUIP AVATAR */}
                    {isAvatar && !isActiveAvatar && (
                      <button
                        onClick={() => handleEquipAvatar(item.id)}
                        className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg"
                      >
                        Equip Avatar
                      </button>
                    )}

                    {/* EQUIPPED AVATAR */}
                    {isAvatar && isActiveAvatar && (
                      <button className="w-full px-4 py-2 bg-yellow-500 text-white rounded-lg">
                        Active Avatar
                      </button>
                    )}

                    {/* EQUIP BACKGROUND */}
                    {isBackground && !isActiveBg && (
                      <button
                        onClick={() => handleEquipBackground(item.id)}
                        className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg"
                      >
                        Equip Background
                      </button>
                    )}

                    {/* ACTIVE BACKGROUND */}
                    {isBackground && isActiveBg && (
                      <button className="w-full px-4 py-2 bg-yellow-500 text-white rounded-lg">
                        Active Background
                      </button>
                    )}

                    {/* CUSTOM PHOTO AVATAR */}
                    {item.id === 'avatar_custom_photo' && (
                      <button
                        onClick={() => setShowPhotoUpload(true)}
                        className="w-full px-4 py-2 bg-purple-500 text-white rounded-lg flex gap-1 justify-center"
                      >
                        <Camera className="h-4 w-4" /> {hasUploadedPhoto ? 'Manage Photo' : 'Upload Photo'}
                      </button>
                    )}

                  </div>
                ) : (
                  /* NOT OWNED — BUY OR CLAIM */
                  <button
                    disabled={purchaseLoading === item.id || isLocked}
                    className={`w-full px-4 py-2 mt-4 rounded-lg flex items-center justify-center gap-2 ${
                      isLocked
                        ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                        : 'bg-blue-500 hover:bg-blue-600 text-white'
                    }`}
                    onClick={() => handlePurchase(item)}
                  >
                    {isLocked && <Lock className="h-4 w-4" />}
                    {purchaseLoading === item.id
                      ? 'Processing...'
                      : isLocked
                        ? `Locked - Level ${item.levelRequired} Required`
                        : item.isLevelReward
                          ? 'Claim Reward'
                          : 'Buy'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* PHOTO UPLOAD MODAL */}
      <PhotoUploadModal
        isOpen={showPhotoUpload}
        onClose={() => setShowPhotoUpload(false)}
        onUploadSuccess={() => {
          setShowPhotoUpload(false);
          setHasUploadedPhoto(true);
          fetchUserData();
        }}
      />
    </div>
  );
}
