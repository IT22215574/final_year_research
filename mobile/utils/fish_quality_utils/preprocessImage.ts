// utils/fish_quality_utils/preprocessImage.ts

import * as ImageManipulator from 'expo-image-manipulator';
import { Platform } from 'react-native';

export interface PreparedUploadImage {
  uri: string;
  name: string;
  type: string;
}

export interface ImageQualityInfo {
  width: number;
  height: number;
  aspectRatio: number;
  isScreenshot: boolean;
  qualityIssues: string[];
}

/**
 * Assess image quality on device
 */
export async function assessImageQuality(uri: string): Promise<ImageQualityInfo> {
  try {
    console.log(`[assessImageQuality] Assessing:`, uri);

    const manipulated = await ImageManipulator.manipulateAsync(uri, [], {
      format: ImageManipulator.SaveFormat.JPEG,
    });

    const width = manipulated.width;
    const height = manipulated.height;
    const aspectRatio = Math.max(width / height, height / width);

    const qualityIssues: string[] = [];
    
    if (width < 100 || height < 100) {
      qualityIssues.push('very_small');
    }
    
    if (aspectRatio > 3.0) {
      qualityIssues.push('extreme_aspect_ratio');
    }

    // Check if likely a screenshot based on filename or aspect ratio
    const isScreenshot = 
      uri.toLowerCase().includes('screenshot') || 
      uri.toLowerCase().includes('screen') ||
      uri.toLowerCase().includes('capture') ||
      uri.toLowerCase().includes('screencap') ||
      (aspectRatio > 1.7 && aspectRatio < 2.1); // Common screenshot ratios (16:9, etc.)

    return {
      width,
      height,
      aspectRatio,
      isScreenshot,
      qualityIssues
    };
  } catch (error) {
    console.error('[assessImageQuality] Failed:', error);
    return {
      width: 0,
      height: 0,
      aspectRatio: 1,
      isScreenshot: false,
      qualityIssues: ['assessment_failed']
    };
  }
}

/**
 * Enhance image for better internet image handling
 * Note: expo-image-manipulator only supports resize, rotate, flip, crop
 * (no direct contrast/sharpness adjustments)
 */
export async function enhanceImage(uri: string): Promise<string> {
  try {
    console.log('[enhanceImage] Normalizing image size...');
    
    // Only use valid expo-image-manipulator actions
    // Resize to max 800px width for consistent processing
    const enhanced = await ImageManipulator.manipulateAsync(
      uri,
      [
        { resize: { width: 800 } }, // Normalize size for consistent detection
      ],
      { 
        compress: 0.92,
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );
    
    console.log('[enhanceImage] Image prepared');
    return enhanced.uri;
  } catch (error) {
    console.error('[enhanceImage] Failed:', error);
    return uri; // Return original if enhancement fails
  }
}

/**
 * Prepare image for upload with optional enhancement
 */
export async function prepareImageForUpload(
  uri: string,
  fieldName: string,
  options?: { enhance?: boolean }
): Promise<PreparedUploadImage> {
  try {
    console.log(`[prepareImageForUpload] Preparing ${fieldName}:`, uri);

    let processedUri = uri;
    
    // Apply enhancement if requested
    if (options?.enhance) {
      processedUri = await enhanceImage(uri);
    }

    const manipulated = await ImageManipulator.manipulateAsync(processedUri, [], {
      compress: 0.92,
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
    console.error('[getImageDimensions] Error:', error);
    throw error;
  }
}