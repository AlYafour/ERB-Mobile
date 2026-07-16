import React from 'react';
import { AppEmptyState } from '@/components/ui/AppEmptyState';

interface AppErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
}

/**
 * Dedicated error surface — a named wrapper over AppEmptyState's error
 * variant so screens read `<AppErrorState onRetry={...}>` instead of
 * remembering variant strings.
 */
export function AppErrorState({
  title = 'Something went wrong',
  message = 'Could not load this content. Check your connection and try again.',
  onRetry,
  retryLabel = 'Try Again',
}: AppErrorStateProps) {
  return (
    <AppEmptyState
      variant="error"
      title={title}
      message={message}
      actionLabel={onRetry ? retryLabel : undefined}
      onAction={onRetry}
    />
  );
}
