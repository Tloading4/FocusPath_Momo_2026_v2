import { GraduationCap, Briefcase } from 'lucide-react';

export type FocusMode = 'school' | 'work';

interface FocusModeSelectorProps {
  selectedMode: FocusMode | null;
  onSelectMode: (mode: FocusMode) => void;
}

export function FocusModeSelector({ selectedMode, onSelectMode }: FocusModeSelectorProps) {
  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h3 className="text-lg font-bold text-white mb-2">Choose Your Focus Mode</h3>
        <p className="text-sm text-gray-300">Select the context for your focus session</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          onClick={() => onSelectMode('school')}
          className={`group relative overflow-hidden rounded-xl border-2 transition-all duration-300 p-6 text-left ${
            selectedMode === 'school'
              ? 'border-blue-400 bg-gradient-to-br from-blue-500/30 to-teal-500/30 scale-105'
              : 'border-white/20 bg-white/5 hover:border-blue-400/50 hover:bg-white/10'
          }`}
          aria-pressed={selectedMode === 'school'}
        >
          <div className="relative z-10">
            <div
              className={`inline-flex p-3 rounded-xl mb-4 transition-all ${
                selectedMode === 'school'
                  ? 'bg-blue-500'
                  : 'bg-blue-500/20 group-hover:bg-blue-500/30'
              }`}
            >
              <GraduationCap
                className={`h-8 w-8 ${
                  selectedMode === 'school' ? 'text-white' : 'text-blue-400'
                }`}
              />
            </div>

            <h4 className="text-xl font-bold text-white mb-2">School Mode</h4>
            <p className="text-sm text-gray-300 mb-3">
              Perfect for homework assignments, test preparation, and academic study sessions
            </p>

            <ul className="space-y-1 text-xs text-gray-400">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                Track homework progress
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                Test preparation focus
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                Subject-specific tracking
              </li>
            </ul>
          </div>

          {selectedMode === 'school' && (
            <div className="absolute top-2 right-2 bg-blue-500 text-white px-2 py-1 rounded-full text-xs font-semibold">
              Selected
            </div>
          )}
        </button>

        <button
          onClick={() => onSelectMode('work')}
          className={`group relative overflow-hidden rounded-xl border-2 transition-all duration-300 p-6 text-left ${
            selectedMode === 'work'
              ? 'border-slate-400 bg-gradient-to-br from-slate-500/30 to-gray-500/30 scale-105'
              : 'border-white/20 bg-white/5 hover:border-slate-400/50 hover:bg-white/10'
          }`}
          aria-pressed={selectedMode === 'work'}
        >
          <div className="relative z-10">
            <div
              className={`inline-flex p-3 rounded-xl mb-4 transition-all ${
                selectedMode === 'work'
                  ? 'bg-slate-500'
                  : 'bg-slate-500/20 group-hover:bg-slate-500/30'
              }`}
            >
              <Briefcase
                className={`h-8 w-8 ${
                  selectedMode === 'work' ? 'text-white' : 'text-slate-400'
                }`}
              />
            </div>

            <h4 className="text-xl font-bold text-white mb-2">Work Mode</h4>
            <p className="text-sm text-gray-300 mb-3">
              Ideal for professional tasks, projects, meetings, and business activities
            </p>

            <ul className="space-y-1 text-xs text-gray-400">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                Professional task tracking
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                Project-based focus
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                Category-specific analytics
              </li>
            </ul>
          </div>

          {selectedMode === 'work' && (
            <div className="absolute top-2 right-2 bg-slate-500 text-white px-2 py-1 rounded-full text-xs font-semibold">
              Selected
            </div>
          )}
        </button>
      </div>

      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mt-4">
        <p className="text-xs text-blue-200 text-center">
          <span className="font-semibold">Note:</span> Your selected mode will be locked for the duration of the session
        </p>
      </div>
    </div>
  );
}
