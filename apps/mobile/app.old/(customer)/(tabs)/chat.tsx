import React from 'react';
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
import { Avatar } from '@/components/Avatar';

const MOCK_CHATS = [
  {
    bookingId: 'b1',
    provider: 'Sipho Dlamini',
    lastMessage: 'I\'m on my way, about 10 minutes away.',
    time: '14:02',
    unread: 2,
  },
  {
    bookingId: 'b2',
    provider: 'Nandi Mokoena',
    lastMessage: 'Confirmed for Friday at 9am!',
    time: 'Yesterday',
    unread: 0,
  },
];

export default function ChatListScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {MOCK_CHATS.map((chat) => (
          <TouchableOpacity
            key={chat.bookingId}
            style={styles.chatRow}
            onPress={() => router.push(`/(customer)/chat/${chat.bookingId}`)}
            activeOpacity={0.8}
          >
            <Avatar name={chat.provider} size={48} color={C.purple} />
            <View style={styles.chatInfo}>
              <View style={styles.chatHeader}>
                <Text style={styles.providerName}>{chat.provider}</Text>
                <Text style={styles.time}>{chat.time}</Text>
              </View>
              <View style={styles.chatFooter}>
                <Text style={styles.lastMessage} numberOfLines={1}>
                  {chat.lastMessage}
                </Text>
                {chat.unread > 0 && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadText}>{chat.unread}</Text>
                  </View>
                )}
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  title: { fontSize: 26, fontWeight: '800', color: C.text },
  list: { paddingTop: 8 },
  chatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    gap: 14,
  },
  chatInfo: { flex: 1 },
  chatHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  providerName: { fontSize: 15, fontWeight: '700', color: C.text },
  time: { fontSize: 12, color: C.muted },
  chatFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  lastMessage: { fontSize: 13, color: C.muted, flex: 1 },
  unreadBadge: {
    backgroundColor: C.accent,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  unreadText: { color: '#000', fontSize: 11, fontWeight: '800' },
});
