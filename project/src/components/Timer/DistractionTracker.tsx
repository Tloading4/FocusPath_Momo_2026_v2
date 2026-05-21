import { useState } from 'react';
import { AlertTriangle, Eye, TrendingDown } from 'lucide-react';

interface Distraction {
  id: string;
  type: 'manual' | 'automatic';
  category: string;
  timestamp: Date;
  context: string;
}

interface DistractionTrackerProps {
  isActive: boolean;
  onDistractionLogged: (distraction: Distraction) => void;
}

export function DistractionTracker({ isActive, onDistractionLogged }: DistractionTrackerProps) {
  const [distractions, setDistractions] = useState<Distraction[]>([]);
  const [showQuickLog, setShowQuickLog] = useState(false);

  const commonDistractions = [
    { category: 'phone', label: 'Phone/Notifications', icon: '📱' },
    { category: 'social_media', label: 'Social Media', icon: '📱' },
    { category: 'thoughts', label: 'Wandering Thoughts', icon: '💭' },
    { category: 'noise', label: 'External Noise', icon: '🔊' },
    { category: 'hunger', label: 'Hunger/Thirst', icon: '🍎' },
    { category: 'other', label: 'Other', icon: '❓' }
  ];

  const logDistraction = (category: string, context: string = '') => {
    const distraction: Distraction = {
      id: Date.now().toString(),
      type: 'manual',
      category,
      timestamp: new Date(),
      context: context || `${category} distraction`
    };

    setDistractions(prev => [...prev, distraction]);
    onDistractionLogged(distraction);
    setShowQuickLog(false);
  };

  if (!isActive) return null;

  return (
    <div className="glass-card rounded-xl p-4 border border-white/20">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold flex items-center gap-2">
          <Eye className="h-5 w-5 text-orange-400" />
          Distraction Tracker
        </h3>
        <button
          onClick={() => setShowQuickLog(!showQuickLog)}
          className="bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 px-3 py-1 rounded-lg transition-all text-sm"
        >
          Log Distraction
        </button>
      </div>

      {showQuickLog && (
        <div className="mb-4 p-4 rounded-lg border border-white/10">
          <h4 className="text-white font-medium mb-3">What distracted you?</h4>
          <div className="grid grid-cols-2 gap-2">
            {commonDistractions.map((item) => (
              <button
                key={item.category}
                onClick={() => logDistraction(item.category)}
                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white px-3 py-2 rounded-lg transition-all text-sm"
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-300">Session Distractions:</span>
          <span className={`font-semibold ${
            distractions.length === 0 ? 'text-green-400' :
            distractions.length <= 2 ? 'text-yellow-400' : 'text-red-400'
          }`}>
            {distractions.length}
          </span>
        </div>

        {distractions.length > 0 && (
          <div className="max-h-32 overflow-y-auto space-y-1">
            {distractions.slice(-5).map((distraction) => (
              <div key={distraction.id} className="flex items-center gap-2 text-xs rounded p-2">
                <AlertTriangle className="h-3 w-3 text-orange-400" />
                <span className="text-gray-300 flex-1">{distraction.context}</span>
                <span className="text-gray-400">
                  {distraction.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        )}

        {distractions.length === 0 && (
          <div className="text-center py-4 text-gray-400 text-sm">
            <TrendingDown className="h-8 w-8 mx-auto mb-2 text-green-400" />
            Great focus! No distractions logged.
          </div>
        )}
      </div>
    </div>
  );
}