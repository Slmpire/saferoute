import React, { useState } from 'react';
import {
  TouchableOpacity, Text, StyleSheet,
  Alert, ActivityIndicator, View,
} from 'react-native';
import { triggerEmergency } from '../services/api';
import { COLORS } from '../constants';

export function EmergencyButton({ schoolId, journeyId }) {
  const [loading, setLoading] = useState(false);

  async function handlePress() {
    Alert.alert(
      '🚨 Trigger Emergency Alert?',
      'This will immediately alert school management, parents, and the security organisation. Only use in a genuine emergency.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'TRIGGER EMERGENCY',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await triggerEmergency(
                schoolId,
                journeyId || null,
                'Emergency triggered from app'
              );
              Alert.alert(
                '🚨 Emergency Alert Sent',
                'Security and all parties have been notified immediately. Stay calm.',
                [{ text: 'OK' }]
              );
            } catch (err) {
              Alert.alert(
                'Error',
                'Could not send emergency alert. Try again or call emergency services directly.'
              );
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  }

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={handlePress}
      disabled={loading}
      activeOpacity={0.85}
    >
      {loading ? (
        <ActivityIndicator color={COLORS.white} size="large" />
      ) : (
        <View style={styles.inner}>
          <Text style={styles.icon}>🚨</Text>
          <Text style={styles.label}>EMERGENCY</Text>
          <Text style={styles.sub}>Tap to alert security immediately</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: COLORS.emergency,
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 24,
    marginVertical: 12,
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.danger,
  },
  inner: {
    alignItems: 'center',
  },
  icon: {
    fontSize: 32,
    marginBottom: 4,
  },
  label: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  sub: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 12,
    marginTop: 4,
  },
});