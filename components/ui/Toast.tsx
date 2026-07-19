import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Platform } from 'react-native';
import { useToast, Toast as ToastType } from '@/lib/hooks/use-toast';
import { IconSymbol } from './icon-symbol';

const isWeb = Platform.OS === 'web' || (typeof window !== 'undefined' && window.document);

export function ToastContainer() {
  const { toasts, removeToast } = useToast();

  return (
    <View style={[styles.container, { pointerEvents: 'box-none' as any }]}>
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
      ))}
    </View>
  );
}

function ToastItem({ toast, onRemove }: { toast: ToastType; onRemove: (id: string) => void }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: -20,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        onRemove(toast.id);
      });
    }, 5000);

    return () => clearTimeout(timer);
    // Intentionally mount-once: each ToastItem is remounted via key={toast.id} when the
    // toast changes, so toast.id/onRemove are stable for this instance's lifetime, and
    // opacity/translateY are refs (their .current identity never changes).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getToastStyle = () => {
    switch (toast.type) {
      case 'success':
        return { backgroundColor: '#d4edda', borderColor: '#c3e6cb', iconColor: '#155724' };
      case 'error':
        return { backgroundColor: '#f8d7da', borderColor: '#f5c6cb', iconColor: '#721c24' };
      case 'warning':
        return { backgroundColor: '#fff3cd', borderColor: '#ffeaa7', iconColor: '#856404' };
      case 'info':
        return { backgroundColor: '#d1ecf1', borderColor: '#bee5eb', iconColor: '#0c5460' };
      default:
        return { backgroundColor: '#e9ecef', borderColor: '#dee2e6', iconColor: '#495057' };
    }
  };

  const getIconName = () => {
    switch (toast.type) {
      case 'success':
        return 'checkmark.circle.fill';
      case 'error':
        return 'xmark.circle.fill';
      case 'warning':
        return 'exclamationmark.triangle.fill';
      case 'info':
        return 'info.circle.fill';
      default:
        return 'info.circle.fill';
    }
  };

  const toastStyle = getToastStyle();

  return (
    <Animated.View
      style={[
        styles.toast,
        {
          backgroundColor: toastStyle.backgroundColor,
          borderColor: toastStyle.borderColor,
          opacity,
          transform: [{ translateY }],
        },
      ]}>
      <IconSymbol name={getIconName() as any} size={20} color={toastStyle.iconColor} />
      <Text style={[styles.toastText, { color: toastStyle.iconColor }]}>{toast.message}</Text>
      <TouchableOpacity onPress={() => onRemove(toast.id)} style={styles.closeButton}>
        <IconSymbol name="xmark" size={16} color={toastStyle.iconColor} />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    zIndex: 9999,
    alignItems: 'center',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
    minWidth: '90%',
    maxWidth: '100%',
    ...(isWeb
      ? {
          boxShadow: '0px 2px 3.84px rgba(0, 0, 0, 0.25)',
        }
      : {
          shadowColor: '#000',
          shadowOffset: {
            width: 0,
            height: 2,
          },
          shadowOpacity: 0.25,
          shadowRadius: 3.84,
          elevation: 5,
        }),
  },
  toastText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  closeButton: {
    padding: 4,
    marginLeft: 8,
  },
});

