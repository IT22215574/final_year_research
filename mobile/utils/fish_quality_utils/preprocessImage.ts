// utils/fish_quality_utils/preprocessImage.ts
// Backend upload preparation for Expo Go.

import * as ImageManipulator from 'expo-image-manipulator';

export interface PreparedUploadImage {
  uri: string;
  name: string;
  type: string;
}

export async function prepareImageForUpload(
  uri: string,
  fieldName: string
): Promise<PreparedUploadImage> {
  try {
    console.log(`[prepareImageForUpload] Preparing ${fieldName}:`, uri);

    const manipulated = await ImageManipulator.manipulateAsync(uri, [], {
      compress: 0.95,
      format: ImageManipulator.SaveFormat.JPEG,
    });

    return {
      uri: manipulated.uri,
      name: `${fieldName}.jpg`,
      type: 'image/jpeg',
    };
  } catch (error) {
    console.error('[prepareImageForUpload] Failed:', error);
    throw error;
  }
}

export async function getImageDimensions(uri: string): Promise<{ width: number; height: number }> {
  try {
    const manipulated = await ImageManipulator.manipulateAsync(uri, [], {
      format: ImageManipulator.SaveFormat.JPEG,
    });
    return { width: manipulated.width, height: manipulated.height };
  } catch (error) {
    console.error('[prepareImageForUpload] Error getting image dimensions:', error);
    throw error;
  }
}