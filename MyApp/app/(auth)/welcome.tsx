import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, StatusBar, Platform } from 'react-native';
import { router } from 'expo-router';
import { C } from '@/constants/theme';
import Feather from '@expo/vector-icons/Feather';

export default function WelcomeScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
      
      {/* Header Section */}
      <View style={styles.headerSection}>
        <View style={styles.iconContainer}>
          <Feather name="heart" size={60} color={C.blue} />
        </View>
        <Text style={styles.appTitle}>Skin Health</Text>
        <Text style={styles.subtitle}>Monitor your skin health with AI-powered insights</Text>
      </View>

      {/* Features Section */}
      <View style={styles.featuresSection}>
        <FeatureItem 
          icon="camera" 
          title="Scan" 
          description="Capture images of your skin"
        />
        <FeatureItem 
          icon="trending-up" 
          title="Track" 
          description="Monitor changes over time"
        />
        <FeatureItem 
          icon="bell" 
          title="Alert" 
          description="Get notifications and insights"
        />
      </View>

      {/* Buttons Section */}
      <View style={styles.buttonsSection}>
        <TouchableOpacity 
          style={styles.primaryButton}
          onPress={() => router.push('/(auth)/register')}
        >
          <Text style={styles.primaryButtonText}>Create Account</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.secondaryButton}
          onPress={() => router.push('/(auth)/login')}
        >
          <Text style={styles.secondaryButtonText}>Sign In</Text>
        </TouchableOpacity>
      </View>

      {/* Footer Text */}
      <View style={styles.footerSection}>
        <Text style={styles.footerText}>
          Secure • Private • Reliable
        </Text>
      </View>
    </SafeAreaView>
  );
}

function FeatureItem({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <View style={styles.featureItem}>
      <View style={styles.featureIconContainer}>
        <Feather name={icon as any} size={28} color={C.blue} />
      </View>
      <View style={styles.featureTextContainer}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureDescription}>{description}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    paddingBottom: 40,
  },
  headerSection: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 50,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: C.blueLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  appTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: C.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: C.muted,
    textAlign: 'center',
    lineHeight: 22,
  },
  featuresSection: {
    flex: 1,
    justifyContent: 'center',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 28,
    marginHorizontal: 16,
  },
  featureIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: C.blueLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  featureTextContainer: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: C.text,
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: C.muted,
  },
  buttonsSection: {
    gap: 12,
    marginBottom: 20,
    marginHorizontal: 20,
  },
  primaryButton: {
    backgroundColor: C.blue,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: C.blue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: C.white,
  },
  secondaryButton: {
    backgroundColor: C.blueLight,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: C.blue,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: C.blue,
  },
  footerSection: {
    alignItems: 'center',
    paddingTop: 20,
  },
  footerText: {
    fontSize: 14,
    color: C.muted,
    letterSpacing: 1,
  },
});
