import React, { useState } from 'react';
import {
  TouchableOpacity, Text, ActivityIndicator,
  StyleSheet, View,
} from 'react-native';
import { useBiometric } from '../hooks/useBiometric';
import { COLORS } from '../constants';

export function CheckpointButton({
  label,
  description,
  onConfirm,
  disabled = false,
  alreadyDone = false,
  promptMessage,
}) {
  const { authenticate, isAuthenticating } = useBiometric();
  const [confirming, setConfirming] = useState(false);

  async function handlePress() {
    if (disabled || alreadyDone || confirming || isAuthenticating) return;

    setConfirming(true);
    try {
      const verified = await authenticate(
        promptMessage || `Verify your fingerprint to confirm: ${label}`
      );
      if (verified) {
        await onConfirm();
      }
    } catch (err) {
      console.error('[CheckpointButton]', err.message);
    } finally {
      setConfirming(false);
    }
  }

  const isLoading = confirming || isAuthenticating;

  return (
    <TouchableOpacity
      style={[
        styles.button,
        alreadyDone && styles.done,
        disabled && !alreadyDone && styles.disabled,
      ]}
      onPress={handlePress}
      disabled={disabled || alreadyDone || isLoading}
      activeOpacity={0.8}
    >
      {isLoading ? (
        <ActivityIndicator color={COLORS.white} />
      ) : (
        <View style={styles.inner}>
          <Text style={styles.icon}>{alreadyDone ? '✅' : '👆'}</Text>
          <View style={styles.textBlock}>
            <Text style={styles.label}>
              {alreadyDone ? 'Confirmed' : label}
            </Text>
            {description && !alreadyDone && (
              <Text style={styles.desc}>{description}</Text>
            )}
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginVertical: 8,
    minHeight: 64,
    justifyContent: 'center',
  },
  done: {
    backgroundColor: COLORS.success,
  },
  disabled: {
    backgroundColor: COLORS.border,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  textBlock: {
    flex: 1,
  },
  icon: {
    fontSize: 24,
  },
  label: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  desc: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginTop: 2,
  },
});