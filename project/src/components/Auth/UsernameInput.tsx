import { useState, useEffect, useCallback } from 'react';
import { Check, X, Loader2, HelpCircle } from 'lucide-react';
import { validateUsername, UsernameValidationResult } from '../../services/usernameService';

interface UsernameInputProps {
  value: string;
  onChange: (value: string) => void;
  onValidationChange?: (isValid: boolean) => void;
  excludeUserId?: string;
  disabled?: boolean;
  autoFocus?: boolean;
}

export function UsernameInput({
  value,
  onChange,
  onValidationChange,
  excludeUserId,
  disabled = false,
  autoFocus = false
}: UsernameInputProps) {
  const [validationState, setValidationState] = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle');
  const [validationResult, setValidationResult] = useState<UsernameValidationResult | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);

  const sanitizeInput = (input: string): string => {
    return input.replace(/[^a-zA-Z0-9_-]/g, '');
  };

  const validateDebounced = useCallback(
    async (username: string) => {
      if (!username || username.length === 0) {
        setValidationState('idle');
        setValidationResult(null);
        onValidationChange?.(false);
        return;
      }

      setValidationState('checking');

      try {
        const result = await validateUsername(username, excludeUserId);
        setValidationResult(result);

        if (result.isValid && result.isAvailable) {
          setValidationState('valid');
          onValidationChange?.(true);
        } else {
          setValidationState('invalid');
          onValidationChange?.(false);
        }
      } catch (error) {
        console.error('Validation error:', error);
        setValidationState('invalid');
        setValidationResult({
          isValid: false,
          isAvailable: false,
          error: 'Failed to validate username'
        });
        onValidationChange?.(false);
      }
    },
    [excludeUserId, onValidationChange]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      if (value) {
        validateDebounced(value);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [value, validateDebounced]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sanitized = sanitizeInput(e.target.value);
    onChange(sanitized);
  };

  const handleSuggestionClick = (suggestion: string) => {
    onChange(suggestion);
  };

  const getStatusIcon = () => {
    switch (validationState) {
      case 'checking':
        return <Loader2 className="h-5 w-5 text-blue-400 animate-spin" />;
      case 'valid':
        return <Check className="h-5 w-5 text-green-400" />;
      case 'invalid':
        return <X className="h-5 w-5 text-red-400" />;
      default:
        return null;
    }
  };

  const getInputBorderColor = () => {
    switch (validationState) {
      case 'checking':
        return 'border-blue-400/50 focus:border-blue-400';
      case 'valid':
        return 'border-green-400/50 focus:border-green-400';
      case 'invalid':
        return 'border-red-400/50 focus:border-red-400';
      default:
        return 'border-gray-600 focus:border-blue-500';
    }
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={handleInputChange}
          disabled={disabled}
          autoFocus={autoFocus}
          placeholder="Choose a unique username"
          maxLength={20}
          className={`w-full px-4 py-3 bg-gray-800/50 border-2 ${getInputBorderColor()} rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all pr-12`}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {getStatusIcon()}
          <button
            type="button"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            onFocus={() => setShowTooltip(true)}
            onBlur={() => setShowTooltip(false)}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <HelpCircle className="h-5 w-5" />
          </button>
        </div>

        {showTooltip && (
          <div className="absolute right-0 top-full mt-2 w-64 p-3 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50 text-sm">
            <p className="text-gray-300 font-semibold mb-2">Username Rules:</p>
            <ul className="text-gray-400 space-y-1 text-xs">
              <li>• 3-20 characters long</li>
              <li>• Letters, numbers, underscores, hyphens</li>
              <li>• Must start with a letter or number</li>
              <li>• Case-insensitive (JohnDoe = johndoe)</li>
            </ul>
          </div>
        )}
      </div>

      <div className="flex justify-between items-center text-sm">
        <div>
          {validationResult?.error && validationState === 'invalid' && (
            <p className="text-red-400">{validationResult.error}</p>
          )}
          {validationState === 'valid' && (
            <p className="text-green-400">Username is available</p>
          )}
          {validationState === 'checking' && (
            <p className="text-blue-400">Checking availability...</p>
          )}
        </div>
        <span className={`${value.length > 20 ? 'text-red-400' : 'text-gray-400'}`}>
          {value.length}/20
        </span>
      </div>

      {validationResult?.suggestions && validationResult.suggestions.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-gray-400">Try these instead:</p>
          <div className="flex flex-wrap gap-2">
            {validationResult.suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => handleSuggestionClick(suggestion)}
                className="px-3 py-1.5 bg-gray-700/50 hover:bg-gray-600/50 border border-gray-600 hover:border-gray-500 rounded-lg text-sm text-gray-300 hover:text-white transition-all"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
