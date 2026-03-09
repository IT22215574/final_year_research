import React from "react";
import {
  TouchableWithoutFeedback,
  View,
  StyleSheet,
  Modal,
} from "react-native";

interface OverlayProps {
  isVisible: boolean;
  onClose: () => void;
}

const Overlay: React.FC<OverlayProps> = ({ isVisible, onClose }) => {
  if (!isVisible) return null;

  return (
    <Modal
      visible={isVisible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay} />
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
});

export default Overlay;
