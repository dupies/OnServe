import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C } from '@/lib/colors';

const MOCK_NOTIFICATIONS = [
  {
    id: 'n1',
    title: 'Sipho is on his way',
    description: 'Your cleaner has checked in and is heading to you.',
    time: '10 min ago',
    unread: true,
  },
  {
    id: 'n2',
    title: 'Booking confirmed',
    description: 'Your booking for Deep Cleaning on Friday at 9am is confirmed.',
    time: '2h ago',
    unread: true,
  },
  {
    id: 'n3',
    title: 'Payment released',
    description: 'R 320 has been released to Nandi Mokoena.',
    time: 'Yesterday',
    unread: false,
  },
  {
    id: 'n4',
    title: 'New quote received',
    description: 'You have a new quote for your plumbing request.',
    time: '2 days ago',
    unread: false,
  },
];

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Notifications</Text>
        <TouchableOpacity onPress={markAllRead}>
          <Text style={styles.markRead}>Mark all read</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {notifications.map((n) => (
          <View key={n.id} style={[styles.notifCard, n.unread && styles.notifCardUnread]}>
            <View style={styles.notifContent}>
              <Text style={styles.notifTitle}>{n.title}</Text>
              <Text style={styles.notifDesc}>{n.description}</Text>
              <Text style={styles.notifTime}>{n.time}</Text>
            </View>
            {n.unread && <View style={styles.unreadDot} />}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  backText: { color: C.muted, fontSize: 15 },
  title: { fontSize: 18, fontWeight: '800', color: C.text },
  markRead: { fontSize: 13, color: C.accent, fontWeight: '600' },
  list: { paddingHorizontal: 20, paddingTop: 8, gap: 10 },
  notifCard: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  notifCardUnread: {
    borderColor: `${C.accent}66`,
    backgroundColor: `${C.accent}08`,
  },
  notifContent: { flex: 1 },
  notifTitle: { fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 4 },
  notifDesc: { fontSize: 13, color: C.muted, lineHeight: 18, marginBottom: 6 },
  notifTime: { fontSize: 11, color: C.muted },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.accent,
    marginTop: 4,
  },
});
