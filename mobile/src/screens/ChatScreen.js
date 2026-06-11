import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { getChatMessages, sendChatMessage } from '../services/api';
import { COLORS } from '../constants';
import dayjs from 'dayjs';

export default function ChatScreen({ route }) {
  const { journeyId, studentName } = route.params;
  const { profile } = useAuth();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef(null);

  const loadMessages = useCallback(async () => {
    try {
      const res = await getChatMessages(journeyId);
      setMessages(res.data);
    } catch (err) {
      console.error('[Chat]', err.message);
    } finally {
      setLoading(false);
    }
  }, [journeyId]);

  useEffect(() => { loadMessages(); }, [loadMessages]);

  // Poll every 5 seconds for new messages
  useEffect(() => {
    const interval = setInterval(loadMessages, 5000);
    return () => clearInterval(interval);
  }, [loadMessages]);

  async function handleSend() {
    if (!text.trim() || sending) return;
    const msg = text.trim();
    setText('');
    setSending(true);
    try {
      await sendChatMessage(journeyId, msg);
      await loadMessages();
      flatListRef.current?.scrollToEnd({ animated: true });
    } catch (err) {
      console.error('[Chat] Send error:', err.message);
    } finally {
      setSending(false);
    }
  }

  function renderMessage({ item }) {
    const isSystem = item.type !== 'user';
    const isMine = item.authorId === profile?.uid;
    const isEmergency = item.type === 'emergency';
    const isAlert = item.type === 'alert';

    const timestamp = item.timestamp?.seconds
      ? item.timestamp.seconds * 1000
      : item.timestamp;

    if (isSystem) {
      return (
        <View style={[
          styles.systemMsg,
          isEmergency && styles.systemEmergency,
          isAlert && styles.systemAlert,
        ]}>
          <Text style={[
            styles.systemText,
            isEmergency && styles.emergencyText,
          ]}>
            {item.text}
          </Text>
          <Text style={styles.systemTime}>
            {dayjs(timestamp).format('HH:mm')}
          </Text>
        </View>
      );
    }

    return (
      <View style={[
        styles.bubble,
        isMine ? styles.bubbleMine : styles.bubbleOther,
      ]}>
        {!isMine && (
          <Text style={styles.senderName}>
            {item.authorName} · {item.authorRole}
          </Text>
        )}
        <Text style={[styles.bubbleText, isMine && styles.bubbleTextMine]}>
          {item.text}
        </Text>
        <Text style={[styles.bubbleTime, isMine && styles.bubbleTimeMine]}>
          {dayjs(timestamp).format('HH:mm')}
        </Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>💬 {studentName}'s Journey</Text>
        <Text style={styles.headerSub}>
          All parties can see this chat
        </Text>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.list}
        onContentSizeChange={() =>
          flatListRef.current?.scrollToEnd({ animated: false })
        }
      />

      {/* Input */}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Type a message..."
          placeholderTextColor={COLORS.textSecondary}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[
            styles.sendBtn,
            (!text.trim() || sending) && styles.sendBtnDisabled,
          ]}
          onPress={handleSend}
          disabled={!text.trim() || sending}
        >
          <Text style={styles.sendIcon}>➤</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    padding: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  headerSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  list: { padding: 12, gap: 8 },
  systemMsg: {
    alignSelf: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    maxWidth: '90%',
    marginVertical: 4,
    alignItems: 'center',
  },
  systemEmergency: {
    backgroundColor: COLORS.emergencyLight,
    borderColor: COLORS.danger,
  },
  systemAlert: {
    backgroundColor: COLORS.warningLight,
    borderColor: COLORS.warning,
  },
  systemText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  emergencyText: { color: COLORS.danger, fontWeight: '600' },
  systemTime: { fontSize: 10, color: COLORS.textSecondary, marginTop: 2 },
  bubble: {
    maxWidth: '75%',
    padding: 10,
    borderRadius: 12,
    marginVertical: 2,
  },
  bubbleMine: {
    alignSelf: 'flex-end',
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderBottomLeftRadius: 4,
  },
  senderName: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginBottom: 3,
    fontWeight: '500',
  },
  bubbleText: { fontSize: 14, color: COLORS.textPrimary },
  bubbleTextMine: { color: COLORS.white },
  bubbleTime: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 3,
    alignSelf: 'flex-end',
  },
  bubbleTimeMine: { color: 'rgba(255,255,255,0.7)' },
  inputRow: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 8,
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 14,
    maxHeight: 100,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sendBtn: {
    width: 40, height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: { backgroundColor: COLORS.border },
  sendIcon: { color: COLORS.white, fontSize: 16 },
});