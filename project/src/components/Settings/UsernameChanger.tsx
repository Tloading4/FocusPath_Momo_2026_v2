import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { supabase } from '../../supabase';
import { Edit3, AlertCircle, Clock } from 'lucide-react';
import { UsernameInput } from '../Auth/UsernameInput';
import {
  getUsernameChangeDate,
  canChangeUsername,
  getDaysUntilNextChange
} from '../../services/usernameService';

interface UsernameChangerProps {
  currentUsername: string;
  onUsernameChanged?: (newUsername: string) => void;
}

export function UsernameChanger({ currentUsername, onUsernameChanged }: UsernameChangerProps) {
  const { currentUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [newUsername, setNewUsername] = useState(currentUsername);
  const [isUsernameValid, setIsUsernameValid] = useState(false);
  const [loading, setLoading] = useState(false);
  const [canChange, setCanChange] = useState(true);
  const [daysUntilChange, setDaysUntilChange] = useState(0);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    checkChangeEligibility();
  }, [currentUser]);

  const checkChangeEligibility = async () => {
    if (!currentUser) return;

    try {
      const lastChangeDate = await getUsernameChangeDate(currentUser.uid);
      const eligible = canChangeUsername(lastChangeDate);
      const daysRemaining = getDaysUntilNextChange(lastChangeDate);

      setCanChange(eligible);
      setDaysUntilChange(daysRemaining);
    } catch (error) {
      console.error('Error checking username change eligibility:', error);
    }
  };

  const handleStartEdit = () => {
    if (!canChange) return;
    setIsEditing(true);
    setNewUsername(currentUsername);
    setError(null);
    setSuccess(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setNewUsername(currentUsername);
    setShowConfirmDialog(false);
    setError(null);
  };

  const handleConfirmChange = () => {
    if (!isUsernameValid || newUsername === currentUsername) return;
    setShowConfirmDialog(true);
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

      setSuccess(true);
      setIsEditing(false);
      setShowConfirmDialog(false);
      onUsernameChanged?.(newUsername);

      await checkChangeEligibility();

      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error('Error updating username:', err);
      setError(err.message || 'Failed to update username. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Username</label>
          {!isEditing && (
            <div className="flex items-center gap-3">
              <span className="text-white font-medium">{currentUsername}</span>
              {success && (
                <span className="text-green-400 text-sm flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  Updated successfully!
                </span>
              )}
            </div>
          )}
        </div>

        {!isEditing && (
          <button
            onClick={handleStartEdit}
            disabled={!canChange}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
              canChange
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-gray-600 cursor-not-allowed text-gray-400'
            }`}
          >
            <Edit3 className="h-4 w-4" />
            Change Username
          </button>
        )}
      </div>

      {!canChange && (
        <div className="flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <Clock className="h-5 w-5 text-yellow-400 mt-0.5" />
          <div className="text-sm">
            <p className="text-yellow-400 font-medium">Username change on cooldown</p>
            <p className="text-gray-400 mt-1">
              You can change your username again in {daysUntilChange} day{daysUntilChange !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      )}

      {isEditing && !showConfirmDialog && (
        <div className="space-y-4">
          <UsernameInput
            value={newUsername}
            onChange={setNewUsername}
            onValidationChange={setIsUsernameValid}
            excludeUserId={currentUser?.uid}
            autoFocus={true}
          />

          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <AlertCircle className="h-5 w-5 text-red-400 mt-0.5" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleConfirmChange}
              disabled={!isUsernameValid || newUsername === currentUsername || loading}
              className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-all"
            >
              Continue
            </button>
            <button
              onClick={handleCancelEdit}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {showConfirmDialog && (
        <div className="p-4 bg-gray-800 border border-gray-700 rounded-lg space-y-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-6 w-6 text-yellow-400 mt-0.5" />
            <div>
              <h3 className="text-white font-semibold mb-2">Confirm Username Change</h3>
              <p className="text-gray-300 text-sm mb-3">
                Are you sure you want to change your username from{' '}
                <span className="font-semibold text-white">{currentUsername}</span> to{' '}
                <span className="font-semibold text-white">{newUsername}</span>?
              </p>
              <p className="text-yellow-400 text-sm">
                You won't be able to change it again for 30 days.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleSaveUsername}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-all"
            >
              {loading ? 'Saving...' : 'Confirm Change'}
            </button>
            <button
              onClick={() => setShowConfirmDialog(false)}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-all"
            >
              Go Back
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
