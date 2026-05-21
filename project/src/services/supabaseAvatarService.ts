import { supabase } from '../supabase';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

export async function resizeImage(file: File, maxWidth: number = 512, maxHeight: number = 512): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Could not create blob from canvas'));
            }
          },
          file.type,
          0.85
        );
      };
      img.onerror = () => reject(new Error('Could not load image'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.readAsDataURL(file);
  });
}

export async function uploadCustomAvatar(
  userId: string,
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> {
  if (!supabase) throw new Error('Custom photo avatars require Supabase configuration.');

  try {
    onProgress?.(10);

    const resizedBlob = await resizeImage(file);
    onProgress?.(30);

    const timestamp = Date.now();
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${timestamp}.${fileExt}`;

    onProgress?.(40);

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, resizedBlob, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    onProgress?.(70);

    const { data: urlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName);

    const downloadURL = urlData.publicUrl;

    const avatarData = {
      user_id: userId,
      storage_path: fileName,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type,
      uploaded_at: new Date().toISOString(),
      is_active: true,
      thumbnail_url: downloadURL,
    };

    const { error: dbError } = await supabase
      .from('custom_avatars')
      .upsert(avatarData, { onConflict: 'user_id' });

    if (dbError) {
      await supabase.storage.from('avatars').remove([fileName]);
      throw new Error(`Database update failed: ${dbError.message}`);
    }

    onProgress?.(90);

    const userProfileRef = doc(db, 'userProfiles', userId);
    await setDoc(
      userProfileRef,
      {
        activeAvatar: 'avatar_custom_photo',
        customAvatarUrl: downloadURL,
        lastUpdated: new Date(),
      },
      { merge: true }
    );

    onProgress?.(100);

    return downloadURL;
  } catch (error) {
    console.error('Error uploading custom avatar:', error);
    throw error;
  }
}

export async function getCustomAvatar(userId: string): Promise<string | null> {
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('custom_avatars')
      .select('thumbnail_url')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error getting custom avatar:', error);
      return null;
    }

    return data?.thumbnail_url || null;
  } catch (error) {
    console.error('Error getting custom avatar:', error);
    return null;
  }
}

export async function deleteCustomAvatar(userId: string): Promise<void> {
  if (!supabase) return;

  try {
    const { data: avatarData, error: fetchError } = await supabase
      .from('custom_avatars')
      .select('storage_path')
      .eq('user_id', userId)
      .maybeSingle();

    if (fetchError) {
      throw new Error(`Failed to fetch avatar data: ${fetchError.message}`);
    }

    if (avatarData?.storage_path) {
      const { error: storageError } = await supabase.storage
        .from('avatars')
        .remove([avatarData.storage_path]);

      if (storageError) {
        console.warn('Failed to delete file from storage:', storageError);
      }
    }

    const { error: deleteError } = await supabase
      .from('custom_avatars')
      .delete()
      .eq('user_id', userId);

    if (deleteError) {
      throw new Error(`Failed to delete avatar record: ${deleteError.message}`);
    }

    const userProfileRef = doc(db, 'userProfiles', userId);
    await setDoc(
      userProfileRef,
      {
        activeAvatar: null,
        customAvatarUrl: null,
        lastUpdated: new Date(),
      },
      { merge: true }
    );
  } catch (error) {
    console.error('Error deleting custom avatar:', error);
    throw error;
  }
}

export async function hasCustomAvatar(userId: string): Promise<boolean> {
  if (!supabase) return false;

  try {
    const { data, error } = await supabase
      .from('custom_avatars')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error checking custom avatar:', error);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error('Error checking custom avatar:', error);
    return false;
  }
}
