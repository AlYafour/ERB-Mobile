import React from 'react';
import { View, Text, Modal, StyleSheet } from 'react-native';
import { useConfirm } from '@/lib/hooks/use-toast';
import { useThemeColor } from '@/hooks/use-theme-color';
import { AppButton as Button } from './AppButton';

export default function ConfirmDialog() {
  const { confirmState, handleConfirm, handleCancel } = useConfirm();
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');

  if (!confirmState || !confirmState.isOpen) return null;

  return (
    <Modal
      visible={confirmState.isOpen}
      transparent
      animationType="fade"
      onRequestClose={handleCancel}>
      <View style={styles.overlay}>
        <View style={[styles.modalContent, { backgroundColor }]}>
          <Text style={[styles.title, { color: textColor }]}>Confirm Action</Text>
          <Text style={[styles.message, { color: textColor }]}>{confirmState.message}</Text>
          
          <View style={styles.actions}>
            <Button
              title="Cancel"
              variant="secondary"
              onPress={handleCancel}
              style={styles.button}
            />
            <Button
              title="Confirm"
              variant="primary"
              onPress={handleConfirm}
              style={styles.button}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 12,
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
  },
  message: {
    fontSize: 14,
    marginBottom: 20,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  button: {
    flex: 1,
  },
});

