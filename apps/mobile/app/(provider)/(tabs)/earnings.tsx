import { View, Text, ScrollView, StatusBar, StyleSheet } from 'react-native';
import { Card, Badge } from '../../../src/components';
import { commonStyles } from '../../../src/utils/styles';
import { colors } from '@onserve/ui-tokens';

export default function EarningsScreen() {
  const styles = StyleSheet.create({
    balanceCard: {
      backgroundColor: colors.primary,
    },
    balanceLabel: {
      color: colors.text.primary,
      fontSize: 14,
      opacity: 0.8,
    },
    balanceAmount: {
      fontSize: 28,
      fontWeight: 'bold',
      color: colors.text.primary,
      marginBottom: 16,
    },
    balanceRow: {
      flexDirection: 'row' as const,
      gap: 16,
    },
    balanceColumn: {
      flex: 1,
    },
    payoutRow: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.surface[2],
    },
    payoutRowLast: {
      borderBottomWidth: 0,
    },
  });

  return (
    <ScrollView style={commonStyles.screenContainer}>
      <StatusBar barStyle="light-content" />
      <View style={commonStyles.screenContent}>
        <Text style={commonStyles.pageTitle}>Earnings</Text>

        <Card style={[commonStyles.cardSpacing, styles.balanceCard]}>
          <View style={{ marginBottom: 16 }}>
            <Text style={styles.balanceLabel}>Total Balance</Text>
            <Text style={styles.balanceAmount}>$2,450.00</Text>
          </View>
          <View style={styles.balanceRow}>
            <View style={styles.balanceColumn}>
              <Text style={styles.balanceLabel}>Available</Text>
              <Text
                style={[
                  styles.balanceAmount,
                  { fontSize: 18, marginBottom: 0 },
                ]}
              >
                $1,200.00
              </Text>
            </View>
            <View style={styles.balanceColumn}>
              <Text style={styles.balanceLabel}>Pending</Text>
              <Text
                style={[
                  styles.balanceAmount,
                  { fontSize: 18, marginBottom: 0 },
                ]}
              >
                $1,250.00
              </Text>
            </View>
          </View>
        </Card>

        <Card style={commonStyles.cardSpacing}>
          <Text style={commonStyles.sectionTitle}>Recent Payouts</Text>
          <View>
            <View style={styles.payoutRow}>
              <View>
                <Text style={commonStyles.textPrimary}>Payout #5001</Text>
                <Text style={commonStyles.textTertiary}>Jun 10, 2024</Text>
              </View>
              <Badge label="Completed" color="success" />
            </View>
            <View style={[styles.payoutRow, styles.payoutRowLast]}>
              <View>
                <Text style={commonStyles.textPrimary}>Payout #5000</Text>
                <Text style={commonStyles.textTertiary}>Jun 3, 2024</Text>
              </View>
              <Badge label="Completed" color="success" />
            </View>
          </View>
        </Card>
      </View>
    </ScrollView>
  );
}
