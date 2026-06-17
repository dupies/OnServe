import { View, Text, ScrollView, StatusBar, StyleSheet } from 'react-native';
import { Card, Button } from '../../../src/components';
import { commonStyles } from '../../../src/utils/styles';
import { colors } from '@onserve/ui-tokens';

export default function ProfileScreen() {
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
      marginBottom: 4,
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
            <Text style={styles.avatarText}>👤</Text>
          </View>
          <Text style={styles.profileName}>John Doe</Text>
          <Text style={commonStyles.textSecondary}>john@example.com</Text>
        </Card>

        <Card style={styles.menuSection}>
          <Text style={styles.sectionLabel}>Preferences</Text>
          <Text style={styles.menuItem}>Notifications</Text>
          <Text style={styles.menuItem}>Saved Addresses</Text>
          <Text style={[styles.menuItem, styles.menuItemLast]}>
            Payment Methods
          </Text>
        </Card>

        <Card style={styles.menuSection}>
          <Text style={styles.sectionLabel}>Account</Text>
          <Text style={styles.menuItem}>Privacy Settings</Text>
          <Text style={styles.menuItem}>Help & Support</Text>
          <Text style={[styles.menuItem, styles.menuItemLast]}>About</Text>
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
