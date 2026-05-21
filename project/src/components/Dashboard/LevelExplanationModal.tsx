import { X, TrendingUp, Star, Award } from 'lucide-react';
import { LevelingService } from '../../services/LevelingService';

interface LevelExplanationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLevel: number;
  currentXP: number;
}

export function LevelExplanationModal({
  isOpen,
  onClose,
  currentLevel,
  currentXP
}: LevelExplanationModalProps) {
  if (!isOpen) return null;

  const levelInfo = LevelingService.getLevelInfo(currentXP);
  const levelTable = LevelingService.getXPTableForLevels(1, Math.min(currentLevel + 5, 25));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden border border-white/10 animate-scale-in">
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-purple-600 p-6 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-xl">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Level System</h2>
              <p className="text-blue-100 text-sm">Progressive XP Requirements</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-xl transition-all"
          >
            <X className="h-6 w-6 text-white" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 rounded-xl p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <Star className="h-8 w-8 text-yellow-400" />
              <div>
                <h3 className="text-2xl font-bold text-white">Your Progress</h3>
                <p className="text-gray-300">Level {currentLevel} - {LevelingService.getLevelTitle(currentLevel)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-black/30 rounded-lg p-4">
                <p className="text-sm text-gray-400 mb-1">Current XP</p>
                <p className="text-2xl font-bold text-white">{currentXP.toLocaleString()}</p>
              </div>
              <div className="bg-black/30 rounded-lg p-4">
                <p className="text-sm text-gray-400 mb-1">XP to Next Level</p>
                <p className="text-2xl font-bold text-white">{(levelInfo.xpForNextLevel - levelInfo.xpIntoCurrentLevel).toLocaleString()}</p>
              </div>
            </div>

            <div className="mt-4">
              <div className="flex justify-between text-sm text-gray-300 mb-2">
                <span>Level {currentLevel} Progress</span>
                <span>{Math.round(levelInfo.progressPercent)}%</span>
              </div>
              <div className="w-full bg-black/30 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-500 to-purple-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${levelInfo.progressPercent}%` }}
                />
              </div>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Award className="h-6 w-6 text-blue-400" />
              <h3 className="text-xl font-bold text-white">How It Works</h3>
            </div>

            <div className="space-y-3 text-gray-300">
              <p className="flex items-start gap-2">
                <span className="text-blue-400 font-bold">•</span>
                <span>Each level requires progressively more XP than the last</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-blue-400 font-bold">•</span>
                <span>Complete focus sessions to earn XP and level up</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-blue-400 font-bold">•</span>
                <span>Higher levels unlock special titles and achievements</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-blue-400 font-bold">•</span>
                <span>The challenge increases to keep you engaged long-term</span>
              </p>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6">
            <h3 className="text-xl font-bold text-white mb-4">Level Titles</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-lg">
                <div className="bg-green-500/20 p-2 rounded-lg">
                  <span className="text-2xl">🎯</span>
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-green-300">Focus Novice</p>
                  <p className="text-xs text-gray-400">Levels 1-4</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-500/30 rounded-lg">
                <div className="bg-blue-500/20 p-2 rounded-lg">
                  <span className="text-2xl">⚡</span>
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-blue-300">Focus Practitioner</p>
                  <p className="text-xs text-gray-400">Levels 5-9</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-lg">
                <div className="bg-purple-500/20 p-2 rounded-lg">
                  <span className="text-2xl">⭐</span>
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-purple-300">Focus Expert</p>
                  <p className="text-xs text-gray-400">Levels 10-19</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 rounded-lg">
                <div className="bg-yellow-500/20 p-2 rounded-lg">
                  <span className="text-2xl">👑</span>
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-yellow-300">Focus Master</p>
                  <p className="text-xs text-gray-400">Level 20+</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <h3 className="text-xl font-bold text-white mb-4">XP Requirements</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-2 px-3 text-gray-400 font-semibold">Level</th>
                    <th className="text-right py-2 px-3 text-gray-400 font-semibold">XP Needed</th>
                    <th className="text-right py-2 px-3 text-gray-400 font-semibold">Total XP</th>
                    <th className="text-left py-2 px-3 text-gray-400 font-semibold">Title</th>
                  </tr>
                </thead>
                <tbody>
                  {levelTable.map((row) => {
                    const isCurrentLevel = row.level === currentLevel;
                    const isPastLevel = row.level < currentLevel;

                    return (
                      <tr
                        key={row.level}
                        className={`border-b border-white/5 ${
                          isCurrentLevel
                            ? 'bg-blue-500/20 border-blue-500/50'
                            : isPastLevel
                            ? 'opacity-60'
                            : ''
                        }`}
                      >
                        <td className={`py-2 px-3 font-semibold ${
                          isCurrentLevel ? 'text-blue-300' : 'text-gray-300'
                        }`}>
                          {row.level} {isCurrentLevel && '← You'}
                        </td>
                        <td className="text-right py-2 px-3 text-gray-300">
                          {row.xpRequired.toLocaleString()} XP
                        </td>
                        <td className="text-right py-2 px-3 text-gray-400">
                          {row.totalXP.toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-gray-400 text-xs">
                          {LevelingService.getLevelTitle(row.level)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {currentLevel > 5 && (
              <p className="text-xs text-gray-400 mt-3 text-center">
                Showing levels 1-{Math.min(currentLevel + 5, 25)}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
