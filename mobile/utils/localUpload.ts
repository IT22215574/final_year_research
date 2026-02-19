import * as FileSystem from 'expo-file-system';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';

export const saveImageLocally = async (uri: string) => {
  try {
    // Generate unique filename
    const hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      uri + Date.now().toString()
    );
    const filename = `${hash}.jpg`;
    const uploadDir = FileSystem.documentDirectory + 'uploads/';
    
    // Create uploads directory if it doesn't exist
    await FileSystem.makeDirectoryAsync(uploadDir, { intermediates: true });
    
    // Copy the image to local storage
    const destUri = `${uploadDir}${filename}`;
    await FileSystem.copyAsync({
      from: uri,
      to: destUri
    });
    
    return destUri;
  } catch (error) {
    console.error('Error saving image locally:', error);
    throw error;
  }
};

export const getLocalImagePath = (filename: string) => {
  return `${FileSystem.documentDirectory}uploads/${filename}`;
};