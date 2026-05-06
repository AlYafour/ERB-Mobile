import React, { useState, useEffect } from 'react';
import { View, Text, Modal, StyleSheet, TextInput } from 'react-native';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Colors } from '@/constants/theme';
import { Button } from './Button';

interface RejectionReasonDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  title?: string;
  message?: string;
}

export default function RejectionReasonDialog({
  isOpen,
  onClose,
  onConfirm,
  title = 'Reject Request',
  message = 'Please provide a reason for rejecting this request:',
}: RejectionReasonDialogProps) {
  const [reason, setReason] = useState('');
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');

  useEffect(() => {
    if (isOpen) {
      setReason('');
    }
  }, [isOpen]);

  const handleSubmit = () => {
    if (reason.trim()) {
      onConfirm(reason.trim());
      setReason('');
    }
  };

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="slide"
      onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalContent, { backgroundColor }]}>
          <Text style={[styles.title, { color: textColor }]}>{title}</Text>
          <Text style={[styles.message, { color: textColor }]}>{message}</Text>
          
          <TextInput
            style={[styles.textArea, { backgroundColor, color: textColor, borderColor: Colors.light.icon }]}
            placeholder="Enter rejection reason..."
            placeholderTextColor={Colors.light.icon}
            value={reason}
            onChangeText={setReason}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          <View style={styles.actions}>
            <Button
              title="Cancel"
              variant="secondary"
              onPress={onClose}
              style={styles.button}
            />
            <Button
              title="Reject"
              variant="danger"
              onPress={handleSubmit}
              disabled={!reason.trim()}
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
    marginBottom: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    minHeight: 100,
    marginBottom: 20,
    fontSize: 16,
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

