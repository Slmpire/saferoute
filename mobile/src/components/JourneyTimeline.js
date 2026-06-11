import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  CHECKPOINTS,
  CHECKPOINT_LABELS,
  CHECKPOINT_ICONS,
  COLORS,
} from '../constants';

const ORDER = [
  CHECKPOINTS.HOME_DEPARTURE,
  CHECKPOINTS.SCHOOL_ARRIVAL,
  CHECKPOINTS.SCHOOL_DEPARTURE,
  CHECKPOINTS.HOME_ARRIVAL,
];

export function JourneyTimeline({ checkpoints = {}, alertStatus }) {
  return (
    <View style={styles.container}>
      {ORDER.map((cp, idx) => {
        const data = checkpoints[cp];
        const done = data?.fullyConfirmed;
        const partialConfirmers = data?.confirmations
          ? Object.keys(data.confirmations)
          : [];
        const partial = !done && partialConfirmers.length > 0;
        const isLast = idx === ORDER.length - 1;

        return (
          <View key={cp} style={styles.step}>

            {/* Connector line to next step */}
            {!isLast && (
              <View style={[styles.line, done && styles.lineDone]} />
            )}

            {/* Circle indicator */}
            <View style={[
              styles.circle,
              done && styles.circleDone,
              partial && styles.circlePartial,
              alertStatus !== 'NONE' && !done && styles.circleAlert,
            ]}>
              <Text style={styles.circleIcon}>
                {done ? '✓' : CHECKPOINT_ICONS[cp]}
              </Text>
            </View>

            {/* Label */}
            <Text style={[styles.label, done && styles.labelDone]}>
              {CHECKPOINT_LABELS[cp]}
            </Text>

            {/* Confirmed time */}
            {done && data?.timestamp && (
              <Text style={styles.time}>
                {new Date(data.timestamp.seconds * 1000).toLocaleTimeString('en-NG', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            )}

            {/* Partial confirmation state */}
            {partial && (
              <Text style={styles.partial}>
                {partialConfirmers.join(', ')} ✓
              </Text>
            )}

          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 16,
    backgroundColor: COLORS.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  step: {
    alignItems: 'center',
    flex: 1,
    position: 'relative',
  },
  line: {
    position: 'absolute',
    top: 20,
    left: '50%',
    right: '-50%',
    height: 2,
    backgroundColor: COLORS.border,
    zIndex: 0,
  },
  lineDone: {
    backgroundColor: COLORS.success,
  },
  circle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    borderWidth: 2,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  circleDone: {
    backgroundColor: COLORS.success,
    borderColor: COLORS.success,
  },
  circlePartial: {
    borderColor: COLORS.warning,
    backgroundColor: COLORS.warningLight,
  },
  circleAlert: {
    borderColor: COLORS.danger,
    backgroundColor: COLORS.dangerLight,
  },
  circleIcon: {
    fontSize: 14,
  },
  label: {
    fontSize: 10,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    fontWeight: '500',
  },
  labelDone: {
    color: COLORS.success,
  },
  time: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  partial: {
    fontSize: 9,
    color: COLORS.warning,
    marginTop: 2,
    textAlign: 'center',
  },
});