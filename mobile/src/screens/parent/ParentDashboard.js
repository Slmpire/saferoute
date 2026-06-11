import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  RefreshControl, TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { JourneyTimeline } from '../../components/JourneyTimeline';
import { EmergencyButton } from '../../components/EmergencyButton';
import { CheckpointButton } from '../../components/CheckpointButton';
import {
  getChildren, getStudentJourney,
  startJourney, confirmCheckpoint,
} from '../../services/api';
import { CHECKPOINTS, COLORS, JOURNEY_STATUS, ALERT_STATUS } from '../../constants';

export default function ParentDashboard({ navigation }) {
  const { profile } = useAuth();
  const [children, setChildren] = useState([]);
  const [journeys, setJourneys] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const childRes = await getChildren();
      const kids = childRes.data;
      setChildren(kids);

      const journeyMap = {};
      for (const kid of kids) {
        try {
          const jRes = await getStudentJourney(kid.uid);
          journeyMap[kid.uid] = jRes.data;
        } catch {
          journeyMap[kid.uid] = null;
        }
      }
      setJourneys(journeyMap);
    } catch (err) {
      Alert.alert('Error', 'Could not load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleCheckpointConfirm(studentId, checkpoint) {
    try {
      let journey = journeys[studentId];

      if (!journey) {
        const res = await startJourney(studentId);
        journey = res.data;
        setJourneys(prev => ({ ...prev, [studentId]: journey }));
      }

      await confirmCheckpoint(journey.id, checkpoint);
      await loadData();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || err.message);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); loadData(); }}
        />
      }
    >
      <Text style={styles.greeting}>
        Good morning, {profile?.name?.split(' ')[0]} 👋
      </Text>
      <Text style={styles.date}>{new Date().toDateString()}</Text>

      {children.length === 0 && (
        <Text style={styles.empty}>No children linked to your account yet.</Text>
      )}

      {children.map(kid => {
        const journey = journeys[kid.uid];
        const cp = journey?.checkpoints || {};
        const alertStatus = journey?.alertStatus || ALERT_STATUS.NONE;
        const status = journey?.status || JOURNEY_STATUS.NOT_STARTED;
        const isAlert = alertStatus !== ALERT_STATUS.NONE;

        return (
          <View key={kid.uid} style={[styles.card, isAlert && styles.cardAlert]}>

            {/* Student header */}
            <View style={styles.studentRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {kid.name?.[0]?.toUpperCase()}
                </Text>
              </View>
              <View style={styles.studentInfo}>
                <Text style={styles.studentName}>{kid.name}</Text>
                <Text style={[
                  styles.statusText,
                  status === 'COMPLETED' && { color: COLORS.success },
                  status === 'ALERT_ACTIVE' && { color: COLORS.danger },
                ]}>
                  {status.replace(/_/g, ' ')}
                </Text>
              </View>
              {isAlert && <Text style={styles.alertBadge}>⚠️ ALERT</Text>}
            </View>

            {/* Journey timeline */}
            <JourneyTimeline checkpoints={cp} alertStatus={alertStatus} />

            {/* Parent checkpoint actions */}
            <View style={styles.actions}>
              <CheckpointButton
                label="Confirm Left Home"
                description="Tap to confirm your child has left for school"
                alreadyDone={cp[CHECKPOINTS.HOME_DEPARTURE]?.fullyConfirmed}
                disabled={!!cp[CHECKPOINTS.HOME_DEPARTURE]?.fullyConfirmed}
                promptMessage={`Confirm ${kid.name} has left home for school`}
                onConfirm={() => handleCheckpointConfirm(kid.uid, CHECKPOINTS.HOME_DEPARTURE)}
              />
              <CheckpointButton
                label="Confirm Arrived Home"
                description="Tap to confirm your child is safely home"
                alreadyDone={cp[CHECKPOINTS.HOME_ARRIVAL]?.fullyConfirmed}
                disabled={!cp[CHECKPOINTS.SCHOOL_DEPARTURE]?.fullyConfirmed}
                promptMessage={`Confirm ${kid.name} has arrived home safely`}
                onConfirm={() => handleCheckpointConfirm(kid.uid, CHECKPOINTS.HOME_ARRIVAL)}
              />
            </View>

            {/* Chat link */}
            {journey && (
              <TouchableOpacity
                style={styles.chatLink}
                onPress={() => navigation.navigate('Chat', {
                  journeyId: journey.id,
                  studentName: kid.name,
                })}
              >
                <Text style={styles.chatLinkText}>💬 Journey Chat</Text>
              </TouchableOpacity>
            )}
          </View>
        );
      })}

      <EmergencyButton
        schoolId={profile?.schoolId || children[0]?.schoolId}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  greeting: { fontSize: 22, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 2 },
  date: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 20 },
  empty: { color: COLORS.textSecondary, textAlign: 'center', marginTop: 40 },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
  cardAlert: { borderColor: COLORS.danger, borderWidth: 2 },
  studentRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { fontSize: 18, fontWeight: '700', color: COLORS.primary },
  studentInfo: { flex: 1 },
  studentName: { fontSize: 16, fontWeight: '600', color: COLORS.textPrimary },
  statusText: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '500', marginTop: 2 },
  alertBadge: { fontSize: 12, fontWeight: '700', color: COLORS.danger },
  actions: { gap: 0 },
  chatLink: {
    paddingVertical: 10,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  chatLinkText: { color: COLORS.primary, fontWeight: '600', fontSize: 14 },
});