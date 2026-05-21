import { useState, useEffect } from 'react';
import {
  Palette,
  FileText,
  Code,
  TrendingUp,
  Users,
  PlusCircle,
  Search,
  BarChart3,
  Clock,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../supabase';

interface WorkCategory {
  id: string;
  name: string;
  categoryType: string;
}

interface WorkCategorySelectorProps {
  selectedCategory: WorkCategory | null;
  customCategory: string;
  onSelectCategory: (category: WorkCategory | null) => void;
  onCustomCategoryChange: (value: string) => void;
}

const categoriesByType = {
  Creative: [
    { id: 'content_creation', name: 'Content Creation', categoryType: 'Creative' },
    { id: 'design_work', name: 'Design Work', categoryType: 'Creative' },
    { id: 'video_production', name: 'Video Production', categoryType: 'Creative' },
    { id: 'writing_editing', name: 'Writing & Editing', categoryType: 'Creative' },
    { id: 'marketing', name: 'Marketing Campaigns', categoryType: 'Creative' },
  ],
  Administrative: [
    { id: 'email_mgmt', name: 'Email Management', categoryType: 'Administrative' },
    { id: 'doc_processing', name: 'Document Processing', categoryType: 'Administrative' },
    { id: 'schedule_mgmt', name: 'Schedule Management', categoryType: 'Administrative' },
    { id: 'data_entry', name: 'Data Entry', categoryType: 'Administrative' },
    { id: 'filing', name: 'Filing & Organization', categoryType: 'Administrative' },
  ],
  Technical: [
    { id: 'software_dev', name: 'Software Development', categoryType: 'Technical' },
    { id: 'code_review', name: 'Code Review', categoryType: 'Technical' },
    { id: 'testing_qa', name: 'Testing & QA', categoryType: 'Technical' },
    { id: 'sys_admin', name: 'System Administration', categoryType: 'Technical' },
    { id: 'tech_docs', name: 'Technical Documentation', categoryType: 'Technical' },
    { id: 'data_analysis', name: 'Data Analysis', categoryType: 'Technical' },
    { id: 'db_mgmt', name: 'Database Management', categoryType: 'Technical' },
  ],
  Strategic: [
    { id: 'strategic_planning', name: 'Strategic Planning', categoryType: 'Strategic' },
    { id: 'research', name: 'Research & Analysis', categoryType: 'Strategic' },
    { id: 'biz_dev', name: 'Business Development', categoryType: 'Strategic' },
    { id: 'financial', name: 'Financial Planning', categoryType: 'Strategic' },
    { id: 'project_mgmt', name: 'Project Management', categoryType: 'Strategic' },
    { id: 'reports', name: 'Report Writing', categoryType: 'Strategic' },
  ],
  Collaborative: [
    { id: 'team_collab', name: 'Team Collaboration', categoryType: 'Collaborative' },
    { id: 'meeting_prep', name: 'Meeting Preparation', categoryType: 'Collaborative' },
    { id: 'client_comm', name: 'Client Communication', categoryType: 'Collaborative' },
    { id: 'presentations', name: 'Presentations', categoryType: 'Collaborative' },
    { id: 'training', name: 'Training & Mentoring', categoryType: 'Collaborative' },
  ],
};

const categoryTypeIcons = {
  Creative: Palette,
  Administrative: FileText,
  Technical: Code,
  Strategic: TrendingUp,
  Collaborative: Users,
};

export function WorkCategorySelector({
  selectedCategory,
  customCategory,
  onSelectCategory,
  onCustomCategoryChange,
}: WorkCategorySelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [categoryStats, setCategoryStats] = useState<Record<string, { count: number; totalMinutes: number; avgFocusScore: number }>>({});
  const { currentUser } = useAuth();

  const allCategories = Object.values(categoriesByType).flat();
  const filteredCategories = searchTerm
    ? allCategories.filter((category) =>
        category.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : allCategories;

  useEffect(() => {
    if (showCustomInput && selectedCategory) {
      onSelectCategory(null);
    }
  }, [showCustomInput]);

  useEffect(() => {
    if (currentUser) {
      fetchCategoryStats();
    }
  }, [currentUser]);

  const fetchCategoryStats = async () => {
    if (!currentUser) return;

    try {
      const { data, error } = await supabase
        .from('focus_sessions')
        .select('session_metadata, duration_actual, focus_score, completed')
        .eq('user_id', currentUser.uid)
        .eq('completed', true)
        .not('session_metadata->workCategory', 'is', null);

      if (error) throw error;

      const stats: Record<string, { count: number; totalMinutes: number; avgFocusScore: number; totalFocusScore: number }> = {};

      data?.forEach((session: any) => {
        const category = session.session_metadata?.workCategory;
        if (category) {
          if (!stats[category]) {
            stats[category] = { count: 0, totalMinutes: 0, avgFocusScore: 0, totalFocusScore: 0 };
          }
          stats[category].count++;
          stats[category].totalMinutes += Math.round((session.duration_actual || 0) / 60);
          stats[category].totalFocusScore += session.focus_score || 0;
        }
      });

      Object.keys(stats).forEach(category => {
        stats[category].avgFocusScore = Math.round(stats[category].totalFocusScore / stats[category].count);
      });

      setCategoryStats(stats);
    } catch (error) {
      console.error('Error fetching category stats:', error);
    }
  };

  const getCategoryStatsDisplay = (categoryName: string) => {
    const stats = categoryStats[categoryName];
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
        <h3 className="text-lg font-bold text-white mb-2">Work Mode Setup</h3>
        <p className="text-sm text-gray-300">Choose your work category</p>
      </div>

      <div className="rounded-xl p-4 border border-white/10">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Select Work Category
        </label>

        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search categories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-slate-500 text-sm"
          />
        </div>

        {searchTerm ? (
          <div className="max-h-64 overflow-y-auto space-y-1">
            {filteredCategories.map((category) => (
              <button
                key={category.id}
                onClick={() => {
                  onSelectCategory(category);
                  setShowCustomInput(false);
                }}
                className={`w-full text-left px-3 py-2 rounded-lg transition-all text-sm ${
                  selectedCategory?.id === category.id
                    ? 'bg-slate-500/40 text-white border border-slate-400'
                    : 'bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10'
                }`}
              >
                <div>
                  {category.name}
                  <span className="text-xs text-gray-400 ml-2">({category.categoryType})</span>
                  {getCategoryStatsDisplay(category.name)}
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {Object.entries(categoriesByType).map(([type, categories]) => {
              const IconComponent = categoryTypeIcons[type as keyof typeof categoryTypeIcons];
              return (
                <div key={type} className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase">
                    <IconComponent className="h-3.5 w-3.5" />
                    {type}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {categories.map((category) => (
                      <button
                        key={category.id}
                        onClick={() => {
                          onSelectCategory(category);
                          setShowCustomInput(false);
                        }}
                        className={`px-3 py-2 rounded-lg transition-all text-xs text-left ${
                          selectedCategory?.id === category.id
                            ? 'bg-slate-500/40 text-white border border-slate-400'
                            : 'bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10'
                        }`}
                      >
                        <div>
                          {category.name}
                          {getCategoryStatsDisplay(category.name)}
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
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/20 hover:border-slate-400/50 rounded-lg text-gray-300 hover:text-white transition-all text-sm"
          >
            <PlusCircle className="h-4 w-4" />
            {showCustomInput ? 'Choose from list' : 'Enter custom category'}
          </button>
        </div>

        {showCustomInput && (
          <div className="mt-3">
            <input
              type="text"
              placeholder="Enter custom category name"
              value={customCategory}
              onChange={(e) => onCustomCategoryChange(e.target.value)}
              className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-slate-500 text-sm"
              maxLength={50}
            />
          </div>
        )}
      </div>

      {(selectedCategory || (showCustomInput && customCategory)) && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <div className="flex-shrink-0 w-2 h-2 rounded-full bg-green-400" />
            <p className="text-sm text-green-200">
              <span className="font-semibold">Work Category:</span>{' '}
              {selectedCategory ? selectedCategory.name : customCategory}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
