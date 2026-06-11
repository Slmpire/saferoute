import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl,
  TouchableOpacity, Alert, ActivityIndicator, TextInput,
} from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { JourneyTimeline } from '../../components/JourneyTimeline';
import { EmergencyButton } from '../../components/EmergencyButton';
import { CheckpointButton } from '../../components/CheckpointButton';
import { getSchoolJourneys, confirmCheckpoint } from '../../services/api';
import { CHECKPOINTS, COLORS, ALERT_STATUS } from '../../constants';

export default function TeacherDashboard({ navigation }) {
  const { profile } = useAuth();
  const [journeys, setJourneys] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    if (!profile?.schoolId) return;
    try {
      const res = await getSchoolJourneys(profile.schoolId);
      setJourneys(res.data);
      setFiltered(res.data);
    } catch (err) {
      Alert.alert('Error', 'Could not load student journeys');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [profile]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (!search.trim()) {
      setFiltered(journeys);
    } else {
      setFiltered(
        journeys.filter(j =>
          j.studentName?.toLowerCase().includes(search.toLowerCase())
        )
      );
    }
  }, [search, journeys]);

  async function handleDismissal(journey) {
    try {
      await confirmCheckpoint(journey.id, CHECKPOINTS.SCHOOL_DEPARTURE);
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

  const alertJourneys = filtered.filter(j => j.alertStatus !== ALERT_STATUS.NONE);
  const normalJourneys = filtered.filter(j => j.alertStatus === ALERT_STATUS.NONE);

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
      <Text style={styles.heading}>Teacher Dashboard</Text>
      <Text style={styles.sub}>{profile?.name} · {new Date().toDateString()}</Text>

      <TextInput
        style={styles.search}
        placeholder="Search student..."
        placeholderTextColor={COLORS.textSecondary}
        value={search}
        onChangeText={setSearch}
      />

      {alertJourneys.length > 0 && (
        <>
          <Text style={styles.sectionHeader}>
            ⚠️ Requires Attention ({alertJourneys.length})
          </Text>
          {alertJourneys.map(j => (
            <JourneyCard
              key={j.id}
              journey={j}
              onDismiss={() => handleDismissal(j)}
              onChat={() => navigation.navigate('Chat', {
                journeyId: j.id,
                studentName: j.studentName,
              })}
            />
          ))}
        </>
      )}

      <Text style={styles.sectionHeader}>
        All Students ({normalJourneys.length})
      </Text>
      {normalJourneys.map(j => (
        <JourneyCard
          key={j.id}
          journey={j}
          onDismiss={() => handleDismissal(j)}
          onChat={() => navigation.navigate('Chat', {
            journeyId: j.id,
            studentName: j.studentName,
          })}
        />
      ))}

      <EmergencyButton schoolId={profile?.schoolId} />
    </ScrollView>
  );
}

function JourneyCard({ journey, onDismiss, onChat }) {
  const cp = journey.checkpoints || {};
  const isAlert = journey.alertStatus !== ALERT_STATUS.NONE;
  const teacherConfirmed = cp[CHECKPOINTS.SCHOOL_DEPARTURE]?.confirmations?.teacher;
  const canDismiss =
    cp[CHECKPOINTS.SCHOOL_ARRIVAL]?.fullyConfirmed &&
    !cp[CHECKPOINTS.SCHOOL_DEPARTURE]?.fullyConfirmed;

  return (
    <View style={[styles.card, isAlert && styles.cardAlert]}>
      <View style={styles.studentRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {journey.studentName?.[0]?.toUpperCase()}
          </Text>
        </View>
        <Text style={styles.studentName}>{journey.studentName}</Text>
        {isAlert && <Text style={styles.alertTag}>⚠️ ALERT</Text>}
      </View>

      <JourneyTimeline
        checkpoints={cp}
        alertStatus={journey.alertStatus}
      />

      {canDismiss && (
        <CheckpointButton
          label="Confirm Dismissal"
          description="Fingerprint to confirm student is leaving school safely"
          alreadyDone={!!teacherConfirmed}
          promptMessage={`Confirm ${journey.studentName} is dismissed from school`}
          onConfirm={onDismiss}
        />
      )}

      <TouchableOpacity style={styles.chatLink} onPress={onChat}>
        <Text style={styles.chatLinkText}>💬 Journey Chat</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  heading: { fontSize: 22, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 2 },
  sub: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 16 },
  search: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.textPrimary,
    marginBottom: 16,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 8,
    marginTop: 4,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
  },
  cardAlert: { borderColor: COLORS.danger, borderWidth: 2 },
  studentRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { fontSize: 16, fontWeight: '700', color: COLORS.primary },
  studentName: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary, flex: 1 },
  alertTag: { fontSize: 11, fontWeight: '700', color: COLORS.danger },
  chatLink: {
    paddingVertical: 8,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  chatLinkText: { color: COLORS.primary, fontWeight: '600', fontSize: 13 },
});