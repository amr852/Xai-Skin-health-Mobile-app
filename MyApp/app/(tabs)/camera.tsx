import { StyleSheet, Text, View } from 'react-native';
import { luminaPalette } from '@/constants/palette';

export default function CameraScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Camera</Text>
        <Text style={styles.subtitle}>Capture or upload a skin photo for analysis.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: luminaPalette.cream,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 24,
    padding: 20,
    backgroundColor: luminaPalette.ivory,
    borderWidth: 1,
    borderColor: luminaPalette.sand,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    color: luminaPalette.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: luminaPalette.textMuted,
    textAlign: 'center',
  },
});
