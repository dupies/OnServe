import { View, Text, ScrollView, StatusBar, StyleSheet } from 'react-native';
import { Card, Badge } from '../../../src/components';
import { commonStyles } from '../../../src/utils/styles';

export default function ProviderJobsScreen() {
  const styles = StyleSheet.create({
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
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
        <Text style={commonStyles.pageTitle}>Jobs</Text>
        <Text style={commonStyles.pageSubtitle}>Manage your bookings</Text>

        <Card style={commonStyles.cardSpacing}>
          <View style={styles.cardHeader}>
            <Text style={commonStyles.sectionTitle}>Plumbing - Pipe Repair</Text>
            <Badge label="Active" color="success" />
          </View>
          <Text style={commonStyles.textSecondary}>Today at 2:00 PM</Text>
          <Text style={commonStyles.textTertiary}>John Doe • $150</Text>
        </Card>

        <Card style={commonStyles.cardSpacing}>
          <View style={styles.cardHeader}>
            <Text style={commonStyles.sectionTitle}>Electrical - Installation</Text>
            <Badge label="Pending" color="warning" />
          </View>
          <Text style={commonStyles.textSecondary}>Tomorrow at 10:00 AM</Text>
          <Text style={commonStyles.textTertiary}>Jane Smith • $200</Text>
        </Card>

        <Card>
          <Text style={[commonStyles.textTertiary, styles.emptyText]}>
            No new job requests
          </Text>
        </Card>
      </View>
    </ScrollView>
  );
}
