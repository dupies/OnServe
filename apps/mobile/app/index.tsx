import { View, Text, StatusBar } from 'react-native';
import { useEffect, useState } from 'react';

export default function HomeScreen() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#0A0A0F', justifyContent: 'center', alignItems: 'center' }}>
      <StatusBar barStyle="light-content" />
      <Text style={{ color: '#fff', fontSize: 24, fontWeight: 'bold' }}>
        OnServe Mobile
      </Text>
      <Text style={{ color: '#999', fontSize: 14, marginTop: 8 }}>
        SDK 56 • Phase 0b Foundation
      </Text>
    </View>
  );
}
