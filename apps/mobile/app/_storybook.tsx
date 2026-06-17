import { ScrollView, View, Text, StatusBar, StyleSheet } from 'react-native';
import { Button, Card, TextField, Badge } from '../src/components';
import { useState } from 'react';
import { colors } from '@onserve/ui-tokens';

export default function Storybook() {
  const [textValue, setTextValue] = useState('');

  const styles = StyleSheet.create({
    screenContainer: {
      flex: 1,
      backgroundColor: colors.surface[0],
    },
    content: {
      paddingHorizontal: 24,
      paddingVertical: 32,
    },
    pageTitle: {
      fontSize: 28,
      fontWeight: 'bold',
      color: colors.text.primary,
      marginBottom: 8,
    },
    pageSubtitle: {
      color: colors.text.secondary,
      fontSize: 16,
      marginBottom: 32,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text.primary,
      marginTop: 24,
      marginBottom: 12,
    },
    cardSpacing: {
      marginBottom: 16,
    },
    buttonGroup: {
      gap: 12,
    },
    colorGrid: {
      gap: 8,
    },
    colorSwatch: {
      height: 48,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.surface[2],
      justifyContent: 'center',
      paddingHorizontal: 12,
    },
    colorLabel: {
      color: colors.text.primary,
      fontWeight: '600',
    },
    badgeRow: {
      flexDirection: 'row' as const,
      gap: 8,
      flexWrap: 'wrap' as const,
    },
  });

  return (
    <ScrollView style={styles.screenContainer}>
      <StatusBar barStyle="light-content" />
      <View style={styles.content}>
        <Text style={styles.pageTitle}>Component Gallery</Text>
        <Text style={styles.pageSubtitle}>Phase 1 Component Kit</Text>

        {/* Buttons */}
        <Text style={styles.sectionTitle}>Buttons</Text>
        <Card style={styles.cardSpacing}>
          <View style={styles.buttonGroup}>
            <Button
              label="Primary Button"
              onPress={() => {}}
              variant="primary"
              size="lg"
            />
            <Button
              label="Secondary Button"
              onPress={() => {}}
              variant="secondary"
              size="lg"
            />
            <Button
              label="Ghost Button"
              onPress={() => {}}
              variant="ghost"
              size="lg"
            />
          </View>
        </Card>

        <Card style={styles.cardSpacing}>
          <Text style={commonSectionTitle}>Button Sizes</Text>
          <View style={styles.buttonGroup}>
            <Button
              label="Small"
              onPress={() => {}}
              variant="primary"
              size="sm"
            />
            <Button
              label="Medium"
              onPress={() => {}}
              variant="primary"
              size="md"
            />
            <Button
              label="Large"
              onPress={() => {}}
              variant="primary"
              size="lg"
            />
          </View>
        </Card>

        <Card style={styles.cardSpacing}>
          <Button
            label="Disabled Button"
            onPress={() => {}}
            variant="primary"
            disabled
            size="lg"
          />
        </Card>

        {/* Text Fields */}
        <Text style={styles.sectionTitle}>Text Fields</Text>
        <Card style={styles.cardSpacing}>
          <TextField
            placeholder="Enter text here..."
            value={textValue}
            onChangeText={setTextValue}
          />
        </Card>

        <Card style={styles.cardSpacing}>
          <TextField
            placeholder="Email address..."
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </Card>

        <Card style={styles.cardSpacing}>
          <TextField placeholder="Password..." secureTextEntry />
        </Card>

        {/* Badges */}
        <Text style={styles.sectionTitle}>Badges</Text>
        <Card style={styles.cardSpacing}>
          <View style={styles.badgeRow}>
            <Badge label="Primary" color="primary" />
            <Badge label="Success" color="success" />
            <Badge label="Warning" color="warning" />
            <Badge label="Error" color="error" />
            <Badge label="Info" color="info" />
          </View>
        </Card>

        <Card style={styles.cardSpacing}>
          <Text style={commonSectionTitle}>Badge Sizes</Text>
          <View style={styles.badgeRow}>
            <Badge label="Small" color="primary" size="sm" />
            <Badge label="Medium" color="primary" size="md" />
          </View>
        </Card>

        {/* Cards */}
        <Text style={styles.sectionTitle}>Cards</Text>
        <Card variant="default" style={styles.cardSpacing}>
          <Text style={commonSectionTitle}>Default Card</Text>
          <Text style={commonSubtext}>
            This is a default card with standard shadow.
          </Text>
        </Card>

        <Card variant="elevated" style={styles.cardSpacing}>
          <Text style={commonSectionTitle}>Elevated Card</Text>
          <Text style={commonSubtext}>
            This is an elevated card with enhanced shadow.
          </Text>
        </Card>

        {/* Color Tokens */}
        <Text style={styles.sectionTitle}>Design Tokens</Text>
        <Card style={styles.cardSpacing}>
          <Text style={commonSectionTitle}>Surface Colors</Text>
          <View style={styles.colorGrid}>
            <View
              style={[styles.colorSwatch, { backgroundColor: colors.surface[0] }]}
            />
            <View
              style={[styles.colorSwatch, { backgroundColor: colors.surface[1] }]}
            />
            <View
              style={[styles.colorSwatch, { backgroundColor: colors.surface[2] }]}
            />
            <View
              style={[styles.colorSwatch, { backgroundColor: colors.surface[3] }]}
            />
          </View>
        </Card>

        <Card style={{ marginBottom: 32 }}>
          <Text style={commonSectionTitle}>Semantic Colors</Text>
          <View style={styles.colorGrid}>
            <View style={[styles.colorSwatch, { backgroundColor: colors.primary }]}>
              <Text style={styles.colorLabel}>Primary</Text>
            </View>
            <View
              style={[styles.colorSwatch, { backgroundColor: colors.semantic.success }]}
            >
              <Text style={styles.colorLabel}>Success</Text>
            </View>
            <View
              style={[styles.colorSwatch, { backgroundColor: colors.semantic.warning }]}
            >
              <Text style={styles.colorLabel}>Warning</Text>
            </View>
            <View
              style={[styles.colorSwatch, { backgroundColor: colors.semantic.error }]}
            >
              <Text style={styles.colorLabel}>Error</Text>
            </View>
          </View>
        </Card>
      </View>
    </ScrollView>
  );
}

const commonSectionTitle = { fontSize: 16, fontWeight: '600' as const, color: colors.text.primary, marginBottom: 12 };
const commonSubtext = { color: colors.text.secondary, fontSize: 14 };
