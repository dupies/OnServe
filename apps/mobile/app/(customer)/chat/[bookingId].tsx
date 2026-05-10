import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C } from '@/lib/colors';
import { supabase } from '@/lib/supabase';

import { useAuthStore } from '@/store/authStore';

interface Message {
  id: string;
  senderId: string;
  body: string;
  createdAt: string;
}

function rowToMessage(r: Record<string, unknown>): Message {
  return {
    id: r['id'] as string,
    senderId: r['sender_id'] as string,
    body: r['body'] as string,
    createdAt: r['created_at'] as string,
  };
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' });
}

export default function ChatScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const userId = useAuthStore((s) => s.user?.id);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  // Load history
  useEffect(() => {
    if (!bookingId) return;
    supabase
      .from('messages')
      .select('*')
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (data) setMessages((data as Record<string, unknown>[]).map(rowToMessage));
      });
  }, [bookingId]);

  // Subscribe to new messages via Realtime
  useEffect(() => {
    if (!bookingId) return;
    const channel = supabase
      .channel(`messages:${bookingId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `booking_id=eq.${bookingId}` },
        (payload) => {
          const incoming = rowToMessage(payload.new as Record<string, unknown>);
          setMessages((prev) => prev.some((m) => m.id === incoming.id) ? prev : [...prev, incoming]);
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [bookingId]);

  const sendMessage = async () => {
    if (!text.trim() || !bookingId || !userId) return;
    setSending(true);
    const body = text.trim();
    setText('');
    await supabase.from('messages').insert({ booking_id: bookingId, sender_id: userId, body });
    setSending(false);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.headerName}>Sipho Dlamini</Text>
            <View style={styles.onlineRow}>
              <View style={styles.onlineDot} />
              <Text style={styles.onlineLabel}>Online</Text>
            </View>
          </View>
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[styles.messages, { paddingBottom: 12 }]}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
        >
          {messages.map((msg) => {
            const isMe = msg.senderId === userId;
            return (
              <View key={msg.id} style={[styles.bubble, isMe ? styles.bubbleMine : styles.bubbleTheirs]}>
                <Text style={[styles.bubbleText, isMe && styles.bubbleTextMine]}>
                  {msg.body}
                </Text>
                <Text style={[styles.bubbleTime, isMe && styles.bubbleTimeMine]}>
                  {fmtTime(msg.createdAt)}
                </Text>
              </View>
            );
          })}
        </ScrollView>

        {/* Input */}
        <View style={[styles.inputRow, { paddingBottom: insets.bottom + 8 }]}>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="Type a message..."
            placeholderTextColor={C.muted}
            multiline
          />
          <TouchableOpacity
            style={[styles.sendBtn, !text.trim() && styles.sendBtnDisabled]}
            onPress={sendMessage}
            disabled={!text.trim()}
          >
            <Text style={styles.sendBtnText}>↑</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    gap: 12,
  },
  backText: { color: C.muted, fontSize: 22 },
  headerInfo: { flex: 1 },
  headerName: { fontSize: 16, fontWeight: '700', color: C.text },
  onlineRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  onlineDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.accent },
  onlineLabel: { fontSize: 12, color: C.accent },
  messages: { paddingHorizontal: 16, paddingTop: 12, gap: 10 },
  bubble: {
    maxWidth: '75%',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 4,
  },
  bubbleMine: {
    alignSelf: 'flex-end',
    backgroundColor: C.accent,
    borderBottomRightRadius: 4,
  },
  bubbleTheirs: {
    alignSelf: 'flex-start',
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderBottomLeftRadius: 4,
  },
  bubbleText: { fontSize: 14, color: C.text, lineHeight: 20 },
  bubbleTextMine: { color: '#000' },
  bubbleTime: { fontSize: 11, color: C.muted, alignSelf: 'flex-end' },
  bubbleTimeMine: { color: 'rgba(0,0,0,0.5)' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: C.border,
    gap: 10,
    backgroundColor: C.bg,
  },
  input: {
    flex: 1,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: C.text,
    fontSize: 14,
    maxHeight: 120,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.5 },
  sendBtnText: { color: '#000', fontSize: 18, fontWeight: '800' },
});
