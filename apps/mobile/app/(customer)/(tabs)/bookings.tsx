import { View, Text, ScrollView, StatusBar, StyleSheet } from 'react-native';
import { Card, Badge } from '../../../src/components';
import { commonStyles } from '../../../src/utils/styles';

export default function BookingsScreen() {
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
        <Text style={commonStyles.pageTitle}>Bookings</Text>
        <Text style={commonStyles.pageSubtitle}>Manage your appointments</Text>

        <Card style={commonStyles.cardSpacing}>
          <View style={styles.cardHeader}>
            <Text style={commonStyles.sectionTitle}>Plumbing Service</Text>
            <Badge label="Scheduled" color="success" />
          </View>
          <Text style={commonStyles.textSecondary}>Today at 2:00 PM</Text>
          <Text style={commonStyles.textTertiary}>John Smith • 4.8 rating</Text>
        </Card>

        <Card style={commonStyles.cardSpacing}>
          <View style={styles.cardHeader}>
            <Text style={commonStyles.sectionTitle}>Cleaning Service</Text>
            <Badge label="Completed" color="info" />
          </View>
          <Text style={commonStyles.textSecondary}>Yesterday at 10:00 AM</Text>
          <Text style={commonStyles.textTertiary}>Sarah Johnson • 4.9 rating</Text>
        </Card>

        <Card>
          <Text style={[commonStyles.textTertiary, styles.emptyText]}>
            No upcoming bookings
          </Text>
        </Card>
      </View>
    </ScrollView>
  );
}
