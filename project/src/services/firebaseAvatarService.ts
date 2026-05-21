import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { getStorage } from 'firebase/storage';
import { doc, setDoc, getDoc, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import app from '../firebase';

const storage = getStorage(app);

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
  try {
    onProgress?.(10);

    const resizedBlob = await resizeImage(file);
    onProgress?.(30);

    const timestamp = Date.now();
    const fileExt = file.name.split('.').pop();
    const fileName = `avatars/${userId}/${timestamp}.${fileExt}`;

    const storageRef = ref(storage, fileName);

    onProgress?.(40);

    const uploadResult = await uploadBytes(storageRef, resizedBlob, {
      contentType: file.type,
    });

    onProgress?.(70);

    const downloadURL = await getDownloadURL(uploadResult.ref);

    const avatarData = {
      user_id: userId,
      storage_path: fileName,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type,
      uploaded_at: new Date(),
      is_active: true,
      thumbnail_url: downloadURL,
    };

    const avatarDocRef = doc(db, 'custom_avatars', userId);
    await setDoc(avatarDocRef, avatarData);

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
  try {
    const avatarDocRef = doc(db, 'custom_avatars', userId);
    const avatarDoc = await getDoc(avatarDocRef);

    if (avatarDoc.exists()) {
      return avatarDoc.data().thumbnail_url || null;
    }

    return null;
  } catch (error) {
    console.error('Error getting custom avatar:', error);
    return null;
  }
}

export async function deleteCustomAvatar(userId: string): Promise<void> {
  try {
    const avatarDocRef = doc(db, 'custom_avatars', userId);
    const avatarDoc = await getDoc(avatarDocRef);

    if (avatarDoc.exists()) {
      const data = avatarDoc.data();

      try {
        const storageRef = ref(storage, data.storage_path);
        await deleteObject(storageRef);
      } catch (error) {
        console.warn('Failed to delete file from storage:', error);
      }

      await deleteDoc(avatarDocRef);

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
    }
  } catch (error) {
    console.error('Error deleting custom avatar:', error);
    throw error;
  }
}

export async function hasCustomAvatar(userId: string): Promise<boolean> {
  try {
    const avatarDocRef = doc(db, 'custom_avatars', userId);
    const avatarDoc = await getDoc(avatarDocRef);
    return avatarDoc.exists();
  } catch (error) {
    console.error('Error checking custom avatar:', error);
    return false;
  }
}
