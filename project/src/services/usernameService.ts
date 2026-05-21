import { supabase } from '../supabase';

export interface UsernameValidationResult {
  isValid: boolean;
  isAvailable: boolean;
  error?: string;
  suggestions?: string[];
}

export interface UsernameFormatValidation {
  isValid: boolean;
  error?: string;
}

const USERNAME_MIN_LENGTH = 3;
const USERNAME_MAX_LENGTH = 20;
const USERNAME_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9_-]*$/;

export async function validateUsernameFormat(username: string): Promise<UsernameFormatValidation> {
  if (!username || username.trim().length === 0) {
    return { isValid: false, error: 'Username is required' };
  }

  if (username.length < USERNAME_MIN_LENGTH) {
    return { isValid: false, error: `Username must be at least ${USERNAME_MIN_LENGTH} characters` };
  }

  if (username.length > USERNAME_MAX_LENGTH) {
    return { isValid: false, error: `Username must be no more than ${USERNAME_MAX_LENGTH} characters` };
  }

  if (!USERNAME_REGEX.test(username)) {
    return {
      isValid: false,
      error: 'Username can only contain letters, numbers, underscores, and hyphens, and must start with a letter or number'
    };
  }

  if (!supabase) return { isValid: true };

  try {
    const { data, error } = await supabase.rpc('validate_username_format', {
      username: username
    });

    if (error) {
      console.error('Error validating username format:', error);
      return { isValid: false, error: 'Failed to validate username format' };
    }

    return { isValid: data === true };
  } catch (error) {
    console.error('Exception validating username format:', error);
    return { isValid: false, error: 'Failed to validate username format' };
  }
}

export async function checkUsernameAvailability(
  username: string,
  excludeUserId?: string
): Promise<boolean> {
  if (!supabase) return true;

  try {
    const { data, error } = await supabase.rpc('check_username_available', {
      username: username,
      exclude_user_id: excludeUserId || null
    });

    if (error) {
      console.error('Error checking username availability:', error);
      console.error('Error details:', JSON.stringify(error));
      throw new Error(`Database error: ${error.message}`);
    }

    return data === true;
  } catch (error: any) {
    console.error('Exception checking username availability:', error);
    throw error;
  }
}

export async function suggestAlternativeUsernames(baseUsername: string): Promise<string[]> {
  if (!supabase) return [];

  try {
    const sanitized = baseUsername.toLowerCase().replace(/[^a-z0-9_-]/g, '');

    const { data, error } = await supabase.rpc('suggest_usernames', {
      base_username: sanitized || 'user',
      limit_count: 5
    });

    if (error) {
      console.error('Error getting username suggestions:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Exception getting username suggestions:', error);
    return [];
  }
}

export async function validateUsername(
  username: string,
  excludeUserId?: string
): Promise<UsernameValidationResult> {
  const formatValidation = await validateUsernameFormat(username);

  if (!formatValidation.isValid) {
    return {
      isValid: false,
      isAvailable: false,
      error: formatValidation.error
    };
  }

  try {
    const isAvailable = await checkUsernameAvailability(username, excludeUserId);

    if (!isAvailable) {
      const suggestions = await suggestAlternativeUsernames(username);
      return {
        isValid: true,
        isAvailable: false,
        error: 'This username is already taken',
        suggestions
      };
    }

    return {
      isValid: true,
      isAvailable: true
    };
  } catch (error: any) {
    console.error('Error in validateUsername:', error);
    return {
      isValid: false,
      isAvailable: false,
      error: error.message || 'Failed to check username availability. Please try again.'
    };
  }
}

export async function checkIfUsernameNeedsUpdate(userId: string): Promise<boolean> {
  if (!supabase) return false;

  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('username_needs_update')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error checking username_needs_update:', error);
      return false;
    }

    return data?.username_needs_update === true;
  } catch (error) {
    console.error('Exception checking username_needs_update:', error);
    return false;
  }
}

export async function getUsernameChangeDate(userId: string): Promise<Date | null> {
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('last_username_change')
      .eq('id', userId)
      .maybeSingle();

    if (error || !data?.last_username_change) {
      return null;
    }

    return new Date(data.last_username_change);
  } catch (error) {
    console.error('Exception getting username change date:', error);
    return null;
  }
}

export function canChangeUsername(lastChangeDate: Date | null): boolean {
  if (!lastChangeDate) return true;

  const COOLDOWN_DAYS = 30;
  const now = new Date();
  const daysSinceLastChange = Math.floor(
    (now.getTime() - lastChangeDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  return daysSinceLastChange >= COOLDOWN_DAYS;
}

export function getDaysUntilNextChange(lastChangeDate: Date | null): number {
  if (!lastChangeDate) return 0;

  const COOLDOWN_DAYS = 30;
  const now = new Date();
  const daysSinceLastChange = Math.floor(
    (now.getTime() - lastChangeDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  return Math.max(0, COOLDOWN_DAYS - daysSinceLastChange);
}
