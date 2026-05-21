import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { supabase } from '../../supabase';
import { AlertTriangle } from 'lucide-react';
import { UsernameInput } from './UsernameInput';
import { checkIfUsernameNeedsUpdate } from '../../services/usernameService';

export function UsernameMigrationModal() {
  const { currentUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [isUsernameValid, setIsUsernameValid] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkIfMigrationNeeded();
  }, [currentUser]);

  const checkIfMigrationNeeded = async () => {
    if (!currentUser) return;

    try {
      const needsUpdate = await checkIfUsernameNeedsUpdate(currentUser.uid);
      setIsOpen(needsUpdate);
    } catch (error) {
      console.error('Error checking username migration status:', error);
    }
  };

  const handleSaveUsername = async () => {
    if (!currentUser || !isUsernameValid) return;

    setLoading(true);
    setError(null);

    try {
      await updateDoc(doc(db, 'userProfiles', currentUser.uid), {
        displayName: newUsername,
        lastUpdated: new Date()
      });

      const { error: supabaseError } = await supabase
        .from('user_profiles')
        .update({
          display_name: newUsername,
          last_username_change: new Date().toISOString(),
          username_needs_update: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentUser.uid);

      if (supabaseError) {
        throw new Error('Failed to sync with database');
      }

      setIsOpen(false);
    } catch (err: any) {
      console.error('Error updating username:', err);
      setError(err.message || 'Failed to update username. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-2xl border border-gray-700 max-w-lg w-full p-6 sm:p-8">
        <div className="flex items-start gap-4 mb-6">
          <div className="bg-yellow-500/20 p-3 rounded-full">
            <AlertTriangle className="h-6 w-6 text-yellow-400" />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-white mb-2">
              Username Update Required
            </h2>
            <p className="text-gray-300 text-sm">
              We've detected that your current username conflicts with another user.
              To ensure everyone has a unique identity, please choose a new username.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Choose Your New Username
            </label>
            <UsernameInput
              value={newUsername}
              onChange={setNewUsername}
              onValidationChange={setIsUsernameValid}
              excludeUserId={currentUser?.uid}
              autoFocus={true}
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-red-400 mt-0.5" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <p className="text-sm text-blue-300">
              <strong>Note:</strong> This is a one-time update. After choosing your new username,
              you'll be able to change it again in 30 days if needed.
            </p>
          </div>

          <button
            onClick={handleSaveUsername}
            disabled={!isUsernameValid || loading}
            className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white rounded-lg transition-all transform hover:scale-105 disabled:hover:scale-100 font-semibold"
          >
            {loading ? 'Updating...' : 'Update Username'}
          </button>

          <p className="text-xs text-gray-400 text-center">
            You must update your username to continue using Focus Path
          </p>
        </div>
      </div>
    </div>
  );
}
