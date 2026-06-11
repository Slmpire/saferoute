import { useState, useCallback } from 'react';
import * as LocalAuthentication from 'expo-local-authentication';
import { Alert } from 'react-native';

export function useBiometric() {
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const checkSupport = useCallback(async () => {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();

    if (!compatible || !enrolled) {
      return false;
    }

    return true;
  }, []);

  const authenticate = useCallback(async (promptMessage = 'Verify your fingerprint to continue') => {
    setIsAuthenticating(true);

    try {
      const supported = await checkSupport();

      // Simulation fallback — no fingerprint hardware or none enrolled
      if (!supported) {
        return new Promise((resolve) => {
          Alert.alert(
            '🔐 Simulation Mode',
            `Fingerprint not available on this device.\n\nTap Confirm to simulate biometric verification.\n\n"${promptMessage}"`,
            [
              { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
              { text: 'Confirm ✓', onPress: () => resolve(true) },
            ]
          );
        });
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage,
        fallbackLabel: 'Use passcode',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });

      return result.success;
    } catch (err) {
      console.error('[Biometric] Error:', err.message);
      Alert.alert('Biometric Error', err.message);
      return false;
    } finally {
      setIsAuthenticating(false);
    }
  }, [checkSupport]);

  return { authenticate, isAuthenticating };
}