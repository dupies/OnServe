import { View, Text, ScrollView, StatusBar, StyleSheet } from 'react-native';
import { Card, Badge } from '../../../src/components';
import { commonStyles } from '../../../src/utils/styles';
import { colors } from '@onserve/ui-tokens';

export default function CustomerHomeScreen() {
  const styles = StyleSheet.create({
    icon: {
      fontSize: 24,
    },
    cardContent: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    badgeRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 12,
      flexWrap: 'wrap',
    },
  });

  return (
    <ScrollView style={commonStyles.screenContainer}>
      <StatusBar barStyle="light-content" />
      <View style={commonStyles.screenContent}>
        <Text style={commonStyles.pageTitle}>Home</Text>
        <Text style={commonStyles.pageSubtitle}>Find and book services</Text>

        <Card style={commonStyles.cardSpacing}>
          <View style={styles.cardContent}>
            <View>
              <Text style={commonStyles.sectionTitle}>Quick Search</Text>
              <Text style={commonStyles.textTertiary}>Find nearby services</Text>
            </View>
            <Text style={styles.icon}>🔍</Text>
          </View>
        </Card>

        <Card style={commonStyles.cardSpacing}>
          <View style={styles.badgeRow}>
            <Badge label="Plumbing" color="primary" />
            <Badge label="Electrical" color="success" />
            <Badge label="Cleaning" color="info" />
          </View>
          <Text style={commonStyles.textSecondary}>
            Popular services near you
          </Text>
        </Card>

        <Card style={commonStyles.cardSpacing}>
          <View style={styles.cardContent}>
            <View>
              <Text style={commonStyles.sectionTitle}>Recent Bookings</Text>
              <Text style={commonStyles.textTertiary}>View and manage</Text>
            </View>
            <Text style={styles.icon}>📅</Text>
          </View>
        </Card>
      </View>
    </ScrollView>
  );
}
