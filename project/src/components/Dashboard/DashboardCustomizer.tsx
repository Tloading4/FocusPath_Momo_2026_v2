import { useState, useEffect } from 'react';
import { X, Eye, EyeOff, RotateCcw, Settings } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';

interface DashboardCustomizerProps {
  isOpen: boolean;
  onClose: () => void;
  onWidgetVisibilityChange: () => void;
}

interface WidgetConfig {
  id: string;
  name: string;
  description: string;
  visible: boolean;
}

const DEFAULT_WIDGETS: Omit<WidgetConfig, 'visible'>[] = [
  {
    id: 'xpProgress',
    name: 'XP Progress',
    description: 'Your level, XP, and progress to next level',
  },
  {
    id: 'streakTracker',
    name: 'Streak Tracker',
    description: 'Current streak and longest streak display',
  },
  {
    id: 'questsPreview',
    name: 'Quests Preview',
    description: 'Active daily and weekly quests',
  },
  {
    id: 'dailyTip',
    name: 'Daily Tip',
    description: 'Productivity tip of the day',
  },
  {
    id: 'personalizedTips',
    name: 'Personalized Tips',
    description: 'AI-powered recommendations based on your activity',
  },
  {
    id: 'collectionsPreview',
    name: 'Collections Preview',
    description: 'Your avatars and collection progress',
  },
];

export function DashboardCustomizer({
  isOpen,
  onClose,
  onWidgetVisibilityChange,
}: DashboardCustomizerProps) {
  const { currentUser } = useAuth();
  const [widgets, setWidgets] = useState<WidgetConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (isOpen && currentUser) {
      loadWidgetPreferences();
    }
  }, [isOpen, currentUser]);

  const loadWidgetPreferences = async () => {
    if (!currentUser) return;

    try {
      setLoading(true);
      const profileRef = doc(db, 'userProfiles', currentUser.uid);
      const profileSnap = await getDoc(profileRef);

      if (profileSnap.exists()) {
        const data = profileSnap.data();
        const preferences = data.preferences || {};
        const dashboardWidgets = preferences.dashboardWidgets || {};

        const loadedWidgets = DEFAULT_WIDGETS.map((widget) => ({
          ...widget,
          visible: dashboardWidgets[widget.id] !== false,
        }));

        setWidgets(loadedWidgets);
      } else {
        const defaultWidgets = DEFAULT_WIDGETS.map((widget) => ({
          ...widget,
          visible: true,
        }));
        setWidgets(defaultWidgets);
      }
    } catch (error) {
      console.error('Error loading widget preferences:', error);
      const defaultWidgets = DEFAULT_WIDGETS.map((widget) => ({
        ...widget,
        visible: true,
      }));
      setWidgets(defaultWidgets);
    } finally {
      setLoading(false);
    }
  };

  const toggleWidget = (widgetId: string) => {
    setWidgets((prev) =>
      prev.map((widget) =>
        widget.id === widgetId
          ? { ...widget, visible: !widget.visible }
          : widget
      )
    );
    setHasChanges(true);
  };

  const resetToDefaults = () => {
    setWidgets((prev) =>
      prev.map((widget) => ({ ...widget, visible: true }))
    );
    setHasChanges(true);
  };

  const savePreferences = async () => {
    if (!currentUser) return;

    try {
      setSaving(true);
      const profileRef = doc(db, 'userProfiles', currentUser.uid);
      const profileSnap = await getDoc(profileRef);
      const currentPreferences = profileSnap.exists()
        ? profileSnap.data().preferences || {}
        : {};

      const dashboardWidgets: Record<string, boolean> = {};
      widgets.forEach((widget) => {
        dashboardWidgets[widget.id] = widget.visible;
      });

      await setDoc(
        profileRef,
        {
          preferences: {
            ...currentPreferences,
            dashboardWidgets,
          },
          lastUpdated: new Date(),
        },
        { merge: true }
      );

      setHasChanges(false);
      onWidgetVisibilityChange();
      onClose();
    } catch (error) {
      console.error('Error saving widget preferences:', error);
      alert('Failed to save preferences. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  // Dashboard customization is now free for all users during beta
  // Removed premium gate

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="customizer-title"
    >
      <div className="w-full max-w-2xl bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-2xl border border-white/20 overflow-hidden animate-slide-up">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg">
              <Settings className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 id="customizer-title" className="text-2xl font-bold text-white">
                Customize Dashboard
              </h2>
              <p className="text-blue-100 text-sm">
                Show or hide widgets to personalize your dashboard
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/10"
            aria-label="Close customizer"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="rounded-xl p-4 animate-pulse"
                >
                  <div className="h-6 bg-white/10 rounded w-1/3 mb-2" />
                  <div className="h-4 bg-white/10 rounded w-2/3" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {widgets.map((widget) => (
                <div
                  key={widget.id}
                  className={`rounded-xl p-4 border-2 transition-all ${
                    widget.visible
                      ? 'border-green-500/30 bg-green-500/5'
                      : 'border-white/10'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {widget.visible ? (
                          <Eye className="h-5 w-5 text-green-400" />
                        ) : (
                          <EyeOff className="h-5 w-5 text-gray-400" />
                        )}
                        <h3 className="text-lg font-semibold text-white">
                          {widget.name}
                        </h3>
                      </div>
                      <p className="text-sm text-gray-400">
                        {widget.description}
                      </p>
                    </div>
                    <button
                      onClick={() => toggleWidget(widget.id)}
                      className={`px-4 py-2 rounded-lg font-medium transition-all ${
                        widget.visible
                          ? 'bg-green-500/20 text-green-300 hover:bg-green-500/30'
                          : 'bg-gray-500/20 text-gray-300 hover:bg-gray-500/30'
                      }`}
                      aria-label={`${widget.visible ? 'Hide' : 'Show'} ${widget.name}`}
                    >
                      {widget.visible ? 'Visible' : 'Hidden'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && widgets.filter((w) => w.visible).length === 0 && (
            <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 mt-4">
              <p className="text-orange-300 text-sm">
                At least one widget should be visible. Your dashboard needs
                content!
              </p>
            </div>
          )}
        </div>

        <div className="bg-white/5 p-6 flex items-center justify-between border-t border-white/10">
          <button
            onClick={resetToDefaults}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Reset to defaults"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Reset to Defaults</span>
          </button>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={saving}
              className="px-6 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={savePreferences}
              disabled={saving || !hasChanges || widgets.filter((w) => w.visible).length === 0}
              className="px-6 py-2 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
