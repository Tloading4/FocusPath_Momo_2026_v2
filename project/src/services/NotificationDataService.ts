import { supabase } from '../supabase';
import { auth } from '../firebase';

export type NotificationType = 'xp_gain' | 'level_up' | 'achievement' | 'quest_complete' | 'streak_milestone';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  description: string;
  amount?: number;
  icon: string;
  metadata: any;
  is_read: boolean;
  created_at: string;
}

export interface NotificationPreferences {
  user_id: string;
  enable_xp_animations: boolean;
  enable_levelup_overlays: boolean;
  enable_notification_sounds: boolean;
  show_small_xp_gains: boolean;
  notification_retention_days: number;
  updated_at: string;
}

class NotificationServiceClass {
  private getCurrentUserId(): string | null {
    return auth.currentUser?.uid || null;
  }

  async addNotification(
    type: NotificationType,
    title: string,
    description: string,
    amount: number = 0,
    icon: string = '🎉',
    metadata: any = {}
  ): Promise<Notification | null> {
    if (!supabase) return null;
    const userId = this.getCurrentUserId();
    if (!userId) return null;

    const { data, error } = await supabase
      .from('user_notifications')
      .insert({
        user_id: userId,
        type,
        title,
        description,
        amount,
        icon,
        metadata,
        is_read: false
      })
      .select()
      .maybeSingle();

    if (error) {
      console.error('Error adding notification:', error);
      return null;
    }

    return data;
  }

  async markAsRead(notificationId: string): Promise<boolean> {
    if (!supabase) return false;

    const { error } = await supabase
      .from('user_notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    if (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }

    return true;
  }

  async markAllAsRead(): Promise<boolean> {
    if (!supabase) return false;
    const userId = this.getCurrentUserId();
    if (!userId) return false;

    const { error } = await supabase
      .from('user_notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) {
      console.error('Error marking all notifications as read:', error);
      return false;
    }

    return true;
  }

  async getUnreadCount(): Promise<number> {
    if (!supabase) return 0;
    const userId = this.getCurrentUserId();
    if (!userId) return 0;

    const { count, error } = await supabase
      .from('user_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }

    return count || 0;
  }

  async getRecentNotifications(limit: number = 50, filterType?: NotificationType): Promise<Notification[]> {
    if (!supabase) return [];
    const userId = this.getCurrentUserId();
    if (!userId) return [];

    let query = supabase
      .from('user_notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (filterType) {
      query = query.eq('type', filterType);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error getting notifications:', error);
      return [];
    }

    return data || [];
  }

  async deleteOldNotifications(days: number = 30): Promise<boolean> {
    if (!supabase) return false;
    const userId = this.getCurrentUserId();
    if (!userId) return false;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const { error } = await supabase
      .from('user_notifications')
      .delete()
      .eq('user_id', userId)
      .lt('created_at', cutoffDate.toISOString());

    if (error) {
      console.error('Error deleting old notifications:', error);
      return false;
    }

    return true;
  }

  async getPreferences(): Promise<NotificationPreferences | null> {
    if (!supabase) return null;
    const userId = this.getCurrentUserId();
    if (!userId) return null;

    const { data, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error getting preferences:', error);
      return null;
    }

    if (!data) {
      const defaultPrefs = await this.initializePreferences();
      return defaultPrefs;
    }

    return data;
  }

  async initializePreferences(): Promise<NotificationPreferences | null> {
    if (!supabase) return null;
    const userId = this.getCurrentUserId();
    if (!userId) return null;

    const defaultPreferences = {
      user_id: userId,
      enable_xp_animations: true,
      enable_levelup_overlays: true,
      enable_notification_sounds: true,
      show_small_xp_gains: true,
      notification_retention_days: 30
    };

    const { data, error } = await supabase
      .from('notification_preferences')
      .insert(defaultPreferences)
      .select()
      .maybeSingle();

    if (error) {
      console.error('Error initializing preferences:', error);
      return null;
    }

    return data;
  }

  async updatePreferences(preferences: Partial<NotificationPreferences>): Promise<boolean> {
    if (!supabase) return false;
    const userId = this.getCurrentUserId();
    if (!userId) return false;

    const { error } = await supabase
      .from('notification_preferences')
      .update({
        ...preferences,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (error) {
      console.error('Error updating preferences:', error);
      return false;
    }

    return true;
  }

  subscribeToNotifications(callback: (notification: Notification) => void): () => void {
    if (!supabase) return () => {};
    const userId = this.getCurrentUserId();
    if (!userId) return () => {};

    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          callback(payload.new as Notification);
        }
      )
      .subscribe();

    return () => {
      supabase!.removeChannel(channel);
    };
  }
}

export const NotificationService = new NotificationServiceClass();
