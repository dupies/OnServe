import { View, Text, ScrollView, StatusBar, StyleSheet } from 'react-native';
import { Card, Badge, Button } from '../../../src/components';
import { commonStyles } from '../../../src/utils/styles';
import { colors } from '@onserve/ui-tokens';

export default function ProviderProfileScreen() {
  const styles = StyleSheet.create({
    profileContainer: {
      alignItems: 'center',
      marginBottom: 16,
    },
    avatar: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
    },
    avatarText: {
      fontSize: 28,
    },
    profileName: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text.primary,
      marginBottom: 8,
    },
    badgeRow: {
      flexDirection: 'row' as const,
      gap: 8,
      marginTop: 8,
    },
    servicesList: {
      marginBottom: 16,
    },
    serviceItem: {
      color: colors.text.secondary,
      paddingVertical: 8,
    },
    menuSection: {
      marginBottom: 16,
    },
    sectionLabel: {
      fontSize: 10,
      color: colors.text.secondary,
      marginBottom: 12,
      textTransform: 'uppercase' as const,
    },
    menuItem: {
      color: colors.text.primary,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.surface[2],
    },
    menuItemLast: {
      borderBottomWidth: 0,
    },
  });

  return (
    <ScrollView style={commonStyles.screenContainer}>
      <StatusBar barStyle="light-content" />
      <View style={commonStyles.screenContent}>
        <Text style={commonStyles.pageTitle}>Profile</Text>

        <Card style={styles.profileContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>👷</Text>
          </View>
          <Text style={styles.profileName}>John Service Pro</Text>
          <View style={styles.badgeRow}>
            <Badge label="4.8★" color="warning" />
            <Badge label="127 jobs" color="info" />
          </View>
        </Card>

        <Card style={styles.servicesList}>
          <Text style={commonStyles.sectionTitle}>Services</Text>
          <Text style={styles.serviceItem}>• Plumbing</Text>
          <Text style={styles.serviceItem}>• Electrical</Text>
          <Text style={styles.serviceItem}>• General Repair</Text>
        </Card>

        <Card style={styles.menuSection}>
          <Text style={styles.sectionLabel}>Settings</Text>
          <Text style={styles.menuItem}>Service Details</Text>
          <Text style={styles.menuItem}>Availability</Text>
          <Text style={[styles.menuItem, styles.menuItemLast]}>
            Banking Info
          </Text>
        </Card>

        <Button
          label="Logout"
          onPress={() => {}}
          variant="secondary"
          size="lg"
        />
      </View>
    </ScrollView>
  );
}
