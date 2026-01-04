import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';

interface OverlayProps {
  isVisible: boolean;
  onClose: () => void;
}

const Overlay: React.FC<OverlayProps> = ({ isVisible, onClose }) => {
  if (!isVisible) return null;

  return (
    <TouchableOpacity 
      style={styles.overlay} 
      onPress={onClose}
      activeOpacity={1}
    />
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 999,
  },
});

export default Overlay;