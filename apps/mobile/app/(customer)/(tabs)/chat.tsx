import { View, Text, ScrollView, StatusBar, StyleSheet } from 'react-native';
import { Card } from '../../../src/components';
import { commonStyles } from '../../../src/utils/styles';
import { colors } from '@onserve/ui-tokens';

export default function ChatScreen() {
  const styles = StyleSheet.create({
    messageRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    messageContent: {
      flex: 1,
    },
    badge: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      width: 24,
      height: 24,
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: 8,
    },
    badgeText: {
      fontSize: 10,
      fontWeight: 'bold',
      color: colors.text.primary,
    },
    emptyText: {
      textAlign: 'center' as const,
      paddingVertical: 24,
    },
  });

  return (
    <ScrollView style={commonStyles.screenContainer}>
      <StatusBar barStyle="light-content" />
      <View style={commonStyles.screenContent}>
        <Text style={commonStyles.pageTitle}>Messages</Text>
        <Text style={commonStyles.pageSubtitle}>Chat with providers</Text>

        <Card style={commonStyles.cardSpacing}>
          <View style={styles.messageRow}>
            <View style={styles.messageContent}>
              <Text style={commonStyles.sectionTitle}>John Smith</Text>
              <Text style={commonStyles.textSecondary}>
                Thanks for booking with me...
              </Text>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>1</Text>
            </View>
          </View>
        </Card>

        <Card style={commonStyles.cardSpacing}>
          <View style={styles.messageRow}>
            <View style={styles.messageContent}>
              <Text style={commonStyles.sectionTitle}>Sarah Johnson</Text>
              <Text style={commonStyles.textSecondary}>
                I'm on my way to your location
              </Text>
            </View>
          </View>
        </Card>

        <Card>
          <Text style={[commonStyles.textTertiary, styles.emptyText]}>
            No active conversations
          </Text>
        </Card>
      </View>
    </ScrollView>
  );
}
