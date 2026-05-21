import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import { Download, FileText, CheckCircle, AlertCircle } from 'lucide-react';

export default function DataExport() {
  const { currentUser } = useAuth();
  const [exporting, setExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [dateRange, setDateRange] = useState<'7' | '30' | 'all'>('30');
  const [format, setFormat] = useState<'csv' | 'json'>('csv');

  const exportData = async () => {
    if (!currentUser || exporting) return;

    try {
      setExporting(true);
      setExportStatus('idle');

      const sessionsRef = collection(db, 'userProfiles', currentUser.uid, 'sessions');

      let q = query(sessionsRef, orderBy('date', 'desc'));

      if (dateRange !== 'all') {
        const daysAgo = new Date();
        daysAgo.setDate(daysAgo.getDate() - parseInt(dateRange));
        q = query(sessionsRef, where('date', '>=', daysAgo), orderBy('date', 'desc'));
      }

      const snapshot = await getDocs(q);

      const sessionsData: any[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        sessionsData.push({
          id: doc.id,
          sessionType: data.sessionType,
          sessionTypeName: data.sessionTypeName,
          category: data.category,
          customTask: data.customTask,
          goal: data.goal,
          motivation: data.motivation,
          focusMode: data.focusMode,
          schoolModeType: data.schoolModeType,
          subject: data.subject,
          workCategory: data.workCategory,
          startTime: data.startTime?.toDate().toISOString(),
          endTime: data.endTime?.toDate().toISOString(),
          duration: data.duration,
          durationSeconds: data.durationSeconds,
          targetDuration: data.targetDuration,
          xpEarned: data.xpEarned,
          xpDeducted: data.xpDeducted,
          baseXP: data.baseXP,
          xpMultiplier: data.xpMultiplier,
          completionPercentage: data.completionPercentage,
          completed: data.completed,
          date: data.date?.toDate().toISOString(),
          focusScore: data.analytics?.focusScore,
          distractionCount: data.analytics?.distractionCount,
          actualFocusTime: data.analytics?.actualFocusTime,
          plannedFocusTime: data.analytics?.plannedFocusTime,
          focusEfficiency: data.analytics?.focusEfficiency,
          pauseCount: data.analytics?.pauseCount,
          totalPauseTime: data.analytics?.totalPauseTime,
          pausePenalty: data.analytics?.pausePenalty,
          timedOut: data.analytics?.timedOut,
          surveyFocusRating: data.session_metadata?.post_survey?.focus_rating,
          surveyEnergyLevel: data.session_metadata?.post_survey?.energy_level,
          surveyDifficulty: data.session_metadata?.post_survey?.difficulty_assessment,
          surveyWouldRepeat: data.session_metadata?.post_survey?.would_repeat,
          surveyNotes: data.session_metadata?.post_survey?.notes,
        });
      });

      if (sessionsData.length === 0) {
        setExportStatus('error');
        setTimeout(() => setExportStatus('idle'), 3000);
        return;
      }

      let content: string;
      let filename: string;
      let mimeType: string;

      if (format === 'csv') {
        const headers = Object.keys(sessionsData[0]).join(',');
        const rows = sessionsData.map(session =>
          Object.values(session).map(value => {
            if (value === null || value === undefined) return '';
            const stringValue = String(value);
            if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
              return `"${stringValue.replace(/"/g, '""')}"`;
            }
            return stringValue;
          }).join(',')
        );
        content = [headers, ...rows].join('\n');
        filename = `focus-path-sessions-${dateRange}days-${new Date().toISOString().split('T')[0]}.csv`;
        mimeType = 'text/csv';
      } else {
        content = JSON.stringify(sessionsData, null, 2);
        filename = `focus-path-sessions-${dateRange}days-${new Date().toISOString().split('T')[0]}.json`;
        mimeType = 'application/json';
      }

      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setExportStatus('success');
      setTimeout(() => setExportStatus('idle'), 3000);
    } catch (error) {
      console.error('Error exporting data:', error);
      setExportStatus('error');
      setTimeout(() => setExportStatus('idle'), 3000);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <FileText size={20} className="text-white" />
        <h3 className="text-lg font-bold text-white">Export Session Data</h3>
      </div>

      <p className="text-sm text-gray-400 mb-6">
        Download your session data including performance metrics, surveys, and analytics
      </p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Date Range</label>
          <div className="flex gap-2">
            <button
              onClick={() => setDateRange('7')}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                dateRange === '7'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              Last 7 Days
            </button>
            <button
              onClick={() => setDateRange('30')}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                dateRange === '30'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              Last 30 Days
            </button>
            <button
              onClick={() => setDateRange('all')}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                dateRange === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              All Time
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Export Format</label>
          <div className="flex gap-2">
            <button
              onClick={() => setFormat('csv')}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                format === 'csv'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              CSV (Excel)
            </button>
            <button
              onClick={() => setFormat('json')}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                format === 'json'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              JSON
            </button>
          </div>
        </div>

        <button
          onClick={exportData}
          disabled={exporting}
          className={`w-full px-6 py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
            exporting
              ? 'bg-gray-600 text-gray-300 cursor-not-allowed'
              : 'bg-gradient-to-r from-blue-600 to-blue-500 text-white hover:from-blue-500 hover:to-blue-400'
          }`}
        >
          {exporting ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              Exporting...
            </>
          ) : (
            <>
              <Download size={20} />
              Export Data
            </>
          )}
        </button>

        {exportStatus === 'success' && (
          <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
            <CheckCircle size={18} className="text-green-400" />
            <span className="text-sm text-green-400">Data exported successfully!</span>
          </div>
        )}

        {exportStatus === 'error' && (
          <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
            <AlertCircle size={18} className="text-red-400" />
            <span className="text-sm text-red-400">No data found for the selected range</span>
          </div>
        )}
      </div>
    </div>
  );
}
