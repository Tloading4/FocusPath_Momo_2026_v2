import { useState, useEffect } from 'react';
import { BookOpen, FlaskConical, Languages, Palette, PlusCircle, Search, BarChart3, TrendingUp, Clock } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../supabase';

export type SchoolModeType = 'homework' | 'test_prep';

interface Subject {
  id: string;
  name: string;
  category: string;
}

interface SchoolSubjectSelectorProps {
  selectedModeType: SchoolModeType | null;
  selectedSubject: Subject | null;
  customSubject: string;
  onSelectModeType: (type: SchoolModeType) => void;
  onSelectSubject: (subject: Subject | null) => void;
  onCustomSubjectChange: (value: string) => void;
}

const subjectsByCategory = {
  STEM: [
    { id: 'math', name: 'Mathematics', category: 'STEM' },
    { id: 'algebra', name: 'Algebra', category: 'STEM' },
    { id: 'geometry', name: 'Geometry', category: 'STEM' },
    { id: 'trigonometry', name: 'Trigonometry', category: 'STEM' },
    { id: 'calculus', name: 'Calculus', category: 'STEM' },
    { id: 'statistics', name: 'Statistics', category: 'STEM' },
    { id: 'biology', name: 'Biology', category: 'STEM' },
    { id: 'chemistry', name: 'Chemistry', category: 'STEM' },
    { id: 'physics', name: 'Physics', category: 'STEM' },
    { id: 'comp_sci', name: 'Computer Science', category: 'STEM' },
    { id: 'env_sci', name: 'Environmental Science', category: 'STEM' },
  ],
  Humanities: [
    { id: 'eng_lit', name: 'English Literature', category: 'Humanities' },
    { id: 'eng_comp', name: 'English Composition', category: 'Humanities' },
    { id: 'creative_writing', name: 'Creative Writing', category: 'Humanities' },
    { id: 'world_history', name: 'World History', category: 'Humanities' },
    { id: 'us_history', name: 'US History', category: 'Humanities' },
    { id: 'euro_history', name: 'European History', category: 'Humanities' },
    { id: 'government', name: 'Government', category: 'Humanities' },
    { id: 'economics', name: 'Economics', category: 'Humanities' },
    { id: 'psychology', name: 'Psychology', category: 'Humanities' },
    { id: 'sociology', name: 'Sociology', category: 'Humanities' },
    { id: 'philosophy', name: 'Philosophy', category: 'Humanities' },
    { id: 'geography', name: 'Geography', category: 'Humanities' },
  ],
  Languages: [
    { id: 'spanish', name: 'Spanish', category: 'Languages' },
    { id: 'french', name: 'French', category: 'Languages' },
    { id: 'german', name: 'German', category: 'Languages' },
    { id: 'mandarin', name: 'Mandarin Chinese', category: 'Languages' },
    { id: 'japanese', name: 'Japanese', category: 'Languages' },
    { id: 'latin', name: 'Latin', category: 'Languages' },
    { id: 'italian', name: 'Italian', category: 'Languages' },
    { id: 'arabic', name: 'Arabic', category: 'Languages' },
  ],
  Arts: [
    { id: 'art', name: 'Art', category: 'Arts' },
    { id: 'music', name: 'Music', category: 'Arts' },
    { id: 'drama', name: 'Drama', category: 'Arts' },
    { id: 'dance', name: 'Dance', category: 'Arts' },
    { id: 'film', name: 'Film Studies', category: 'Arts' },
  ],
  Other: [
    { id: 'pe', name: 'Physical Education', category: 'Other' },
    { id: 'health', name: 'Health', category: 'Other' },
    { id: 'business', name: 'Business', category: 'Other' },
    { id: 'accounting', name: 'Accounting', category: 'Other' },
    { id: 'engineering', name: 'Engineering', category: 'Other' },
  ],
};

const categoryIcons = {
  STEM: FlaskConical,
  Humanities: BookOpen,
  Languages: Languages,
  Arts: Palette,
  Other: PlusCircle,
};

export function SchoolSubjectSelector({
  selectedModeType,
  selectedSubject,
  customSubject,
  onSelectModeType,
  onSelectSubject,
  onCustomSubjectChange,
}: SchoolSubjectSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [subjectStats, setSubjectStats] = useState<Record<string, { count: number; totalMinutes: number; avgFocusScore: number }>>({});
  const { currentUser } = useAuth();

  const allSubjects = Object.values(subjectsByCategory).flat();
  const filteredSubjects = searchTerm
    ? allSubjects.filter((subject) =>
        subject.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : allSubjects;

  useEffect(() => {
    if (showCustomInput && selectedSubject) {
      onSelectSubject(null);
    }
  }, [showCustomInput]);

  useEffect(() => {
    if (currentUser) {
      fetchSubjectStats();
    }
  }, [currentUser]);

  const fetchSubjectStats = async () => {
    if (!currentUser) return;

    try {
      const { data, error } = await supabase
        .from('focus_sessions')
        .select('session_metadata, duration_actual, focus_score, completed')
        .eq('user_id', currentUser.uid)
        .eq('completed', true)
        .not('session_metadata->subject', 'is', null);

      if (error) throw error;

      const stats: Record<string, { count: number; totalMinutes: number; avgFocusScore: number; totalFocusScore: number }> = {};

      data?.forEach((session: any) => {
        const subject = session.session_metadata?.subject;
        if (subject) {
          if (!stats[subject]) {
            stats[subject] = { count: 0, totalMinutes: 0, avgFocusScore: 0, totalFocusScore: 0 };
          }
          stats[subject].count++;
          stats[subject].totalMinutes += Math.round((session.duration_actual || 0) / 60);
          stats[subject].totalFocusScore += session.focus_score || 0;
        }
      });

      Object.keys(stats).forEach(subject => {
        stats[subject].avgFocusScore = Math.round(stats[subject].totalFocusScore / stats[subject].count);
      });

      setSubjectStats(stats);
    } catch (error) {
      console.error('Error fetching subject stats:', error);
    }
  };

  const getSubjectStatsDisplay = (subjectName: string) => {
    const stats = subjectStats[subjectName];
    if (!stats || stats.count === 0) return null;

    return (
      <div className="mt-1 flex items-center gap-3 text-xs">
        <div className="flex items-center gap-1 text-blue-300">
          <BarChart3 className="h-3 w-3" />
          <span>{stats.count} sessions</span>
        </div>
        <div className="flex items-center gap-1 text-green-300">
          <Clock className="h-3 w-3" />
          <span>{stats.totalMinutes}m</span>
        </div>
        <div className="flex items-center gap-1 text-purple-300">
          <TrendingUp className="h-3 w-3" />
          <span>{stats.avgFocusScore}% avg</span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="text-center mb-4">
        <h3 className="text-lg font-bold text-white mb-2">School Mode Setup</h3>
        <p className="text-sm text-gray-300">Choose your focus type and subject</p>
      </div>

      <div className="rounded-xl p-4 border border-white/10">
        <label className="block text-sm font-medium text-gray-300 mb-3">
          What are you working on?
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => onSelectModeType('homework')}
            className={`p-3 rounded-lg border-2 transition-all text-center ${
              selectedModeType === 'homework'
                ? 'border-blue-400 bg-blue-500/30 text-white'
                : 'border-white/20 bg-white/5 text-gray-300 hover:border-blue-400/50 hover:bg-white/10'
            }`}
            aria-pressed={selectedModeType === 'homework'}
          >
            <BookOpen className="h-5 w-5 mx-auto mb-1" />
            <span className="font-semibold text-sm">Homework</span>
          </button>
          <button
            onClick={() => onSelectModeType('test_prep')}
            className={`p-3 rounded-lg border-2 transition-all text-center ${
              selectedModeType === 'test_prep'
                ? 'border-blue-400 bg-blue-500/30 text-white'
                : 'border-white/20 bg-white/5 text-gray-300 hover:border-blue-400/50 hover:bg-white/10'
            }`}
            aria-pressed={selectedModeType === 'test_prep'}
          >
            <FlaskConical className="h-5 w-5 mx-auto mb-1" />
            <span className="font-semibold text-sm">Test Prep</span>
          </button>
        </div>
      </div>

      {selectedModeType && (
        <>
          <div className="rounded-xl p-4 border border-white/10">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Select Subject
            </label>

            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search subjects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>

            {searchTerm ? (
              <div className="max-h-64 overflow-y-auto space-y-1">
                {filteredSubjects.map((subject) => (
                  <button
                    key={subject.id}
                    onClick={() => {
                      onSelectSubject(subject);
                      setShowCustomInput(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-all text-sm ${
                      selectedSubject?.id === subject.id
                        ? 'bg-blue-500/40 text-white border border-blue-400'
                        : 'bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10'
                    }`}
                  >
                    <div>
                      {subject.name}
                      <span className="text-xs text-gray-400 ml-2">({subject.category})</span>
                      {getSubjectStatsDisplay(subject.name)}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {Object.entries(subjectsByCategory).map(([category, subjects]) => {
                  const IconComponent = categoryIcons[category as keyof typeof categoryIcons];
                  return (
                    <div key={category} className="space-y-2">
                      <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase">
                        <IconComponent className="h-3.5 w-3.5" />
                        {category}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {subjects.map((subject) => (
                          <button
                            key={subject.id}
                            onClick={() => {
                              onSelectSubject(subject);
                              setShowCustomInput(false);
                            }}
                            className={`px-3 py-2 rounded-lg transition-all text-xs text-left ${
                              selectedSubject?.id === subject.id
                                ? 'bg-blue-500/40 text-white border border-blue-400'
                                : 'bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10'
                            }`}
                          >
                            <div>
                              {subject.name}
                              {getSubjectStatsDisplay(subject.name)}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-3 pt-3 border-t border-white/10">
              <button
                onClick={() => setShowCustomInput(!showCustomInput)}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/20 hover:border-blue-400/50 rounded-lg text-gray-300 hover:text-white transition-all text-sm"
              >
                <PlusCircle className="h-4 w-4" />
                {showCustomInput ? 'Choose from list' : 'Enter custom subject'}
              </button>
            </div>

            {showCustomInput && (
              <div className="mt-3">
                <input
                  type="text"
                  placeholder="Enter custom subject name"
                  value={customSubject}
                  onChange={(e) => onCustomSubjectChange(e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  maxLength={50}
                />
              </div>
            )}
          </div>

          {(selectedSubject || (showCustomInput && customSubject)) && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <div className="flex-shrink-0 w-2 h-2 rounded-full bg-green-400" />
                <p className="text-sm text-green-200">
                  <span className="font-semibold">
                    {selectedModeType === 'homework' ? 'Homework' : 'Test Prep'}:
                  </span>{' '}
                  {selectedSubject ? selectedSubject.name : customSubject}
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
