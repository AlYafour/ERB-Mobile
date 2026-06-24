import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AppButton } from './AppButton';

interface RejectionReasonDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  loading?: boolean;
  title?: string;
  message?: string;
}

export default function RejectionReasonDialog({
  isOpen,
  onClose,
  onConfirm,
  loading = false,
  title = 'Reject Request',
  message = 'Provide a reason for rejecting. This will be visible to the requester.',
}: RejectionReasonDialogProps) {
  const cs = useColorScheme() ?? 'light';
  const c = Colors[cs];
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setReason('');
      setTouched(false);
    }
  }, [isOpen]);

  const isValid = reason.trim().length > 0;

  const handleSubmit = () => {
    setTouched(true);
    if (isValid && !loading) {
      onConfirm(reason.trim());
    }
  };

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="slide"
      onRequestClose={() => { if (!loading) onClose(); }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={s.overlay}
      >
        <View style={[s.sheet, { backgroundColor: c.surface, borderColor: c.border }]}>
          {/* Header */}
          <View style={[s.header, { borderBottomColor: c.divider }]}>
            <Text style={[s.title, { color: c.textPrimary }]}>{title}</Text>
            <Text style={[s.message, { color: c.textSecondary }]}>{message}</Text>
          </View>

          {/* Input */}
          <View style={s.body}>
            <TextInput
              style={[
                s.textArea,
                {
                  backgroundColor: c.surfaceSoft,
                  borderColor: touched && !isValid ? c.danger : c.border,
                  color: c.textPrimary,
                },
              ]}
              placeholder="Enter rejection reason..."
              placeholderTextColor={c.textMuted}
              value={reason}
              onChangeText={(t) => {
                setReason(t);
                if (touched && t.trim().length > 0) setTouched(false);
              }}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              editable={!loading}
              autoFocus={isOpen}
            />
            {touched && !isValid ? (
              <Text style={[s.errorHint, { color: c.danger }]}>A reason is required to reject.</Text>
            ) : null}
          </View>

          {/* Actions */}
          <View style={[s.actions, { borderTopColor: c.divider }]}>
            <AppButton
              title="Cancel"
              variant="secondary"
              size="md"
              onPress={onClose}
              disabled={loading}
              style={{ flex: 1 }}
            />
            <AppButton
              title={loading ? 'Rejecting...' : 'Confirm Reject'}
              variant="dangerOutline"
              size="md"
              onPress={handleSubmit}
              disabled={loading}
              loading={loading}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderBottomWidth: 0,
    overflow: 'hidden',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
  },
  body: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 100,
    fontSize: 15,
    lineHeight: 22,
  },
  errorHint: {
    fontSize: 12,
    marginTop: 6,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
