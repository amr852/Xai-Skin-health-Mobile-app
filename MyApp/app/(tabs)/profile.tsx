import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Platform,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { C } from '@/constants/theme';

type FeatherIconName = React.ComponentProps<typeof Feather>['name'];

// Mock user data - replace with actual auth context later
const mockUserData = {
  id: '1',
  name: 'Layla Harris',
  email: 'layla.harris@example.com',
  initials: 'LH',
  avatar: '#FF6B9D',
};

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeNav, setActiveNav] = useState<NavKey>('profile');
  const [user] = useState(mockUserData);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [showChangeEmailModal, setShowChangeEmailModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newEmail, setNewEmail] = useState(user.email);
  const [isLoading, setIsLoading] = useState(false);

  const navItems: { key: NavKey; icon: FeatherIconName; a11y: string }[] = [
    { key: 'home', icon: 'home', a11y: 'Home' },
    { key: 'scan', icon: 'camera', a11y: 'Camera' },
    { key: 'history', icon: 'clock', a11y: 'History' },
    { key: 'profile', icon: 'user', a11y: 'Profile' },
  ];

  const handleChangePassword = async () => {
    if (!currentPassword.trim()) {
      Alert.alert('Error', 'Please enter your current password');
      return;
    }
    if (newPassword.trim().length < 6) {
      Alert.alert('Error', 'New password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    try {
      setIsLoading(true);
      // TODO: Replace with actual API call
      await new Promise((resolve) => setTimeout(resolve, 800));
      Alert.alert('Success', 'Password changed successfully', [
        {
          text: 'OK',
          onPress: () => {
            setShowChangePasswordModal(false);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
          },
        },
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to change password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangeEmail = async () => {
    if (!newEmail.trim() || !newEmail.includes('@')) {
      Alert.alert('Error', 'Please enter a valid email');
      return;
    }
    if (newEmail === user.email) {
      Alert.alert('Error', 'New email is the same as current email');
      return;
    }

    try {
      setIsLoading(true);
      // TODO: Replace with actual API call
      await new Promise((resolve) => setTimeout(resolve, 800));
      Alert.alert('Success', 'Email change request sent. Check your email for verification.', [
        {
          text: 'OK',
          onPress: () => {
            setShowChangeEmailModal(false);
            setNewEmail(user.email);
          },
        },
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to change email');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      {
        text: 'Cancel',
        onPress: () => {},
        style: 'cancel',
      },
      {
        text: 'Logout',
        onPress: async () => {
          try {
            // TODO: Replace with actual logout API call and clear auth state
            await new Promise((resolve) => setTimeout(resolve, 400));
            router.replace('/(auth)/login');
          } catch (error) {
            Alert.alert('Error', 'Failed to logout');
          }
        },
        style: 'destructive',
      },
    ]);
  };

  const settingsOptions: {
    icon: FeatherIconName;
    title: string;
    subtitle: string;
    onPress: () => void;
  }[] = [
    {
      icon: 'lock',
      title: 'Change Password',
      subtitle: 'Update your password',
      onPress: () => setShowChangePasswordModal(true),
    },
    {
      icon: 'mail',
      title: 'Change Email',
      subtitle: 'Update your email address',
      onPress: () => setShowChangeEmailModal(true),
    },
    {
      icon: 'bell',
      title: 'Notifications',
      subtitle: 'Manage notification preferences',
      onPress: () => {
        Alert.alert('Coming Soon', 'Notification settings coming in the next update');
      },
    },
    {
      icon: 'shield',
      title: 'Privacy & Security',
      subtitle: 'Manage your data and privacy',
      onPress: () => {
        Alert.alert('Coming Soon', 'Privacy settings coming in the next update');
      },
    },
    {
      icon: 'info',
      title: 'About',
      subtitle: 'App version and information',
      onPress: () => {
        Alert.alert('Skin Lesions Tracker', 'Version 1.0.0\n\nA comprehensive skin health monitoring app');
      },
    },
  ];

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      <ScrollView
        style={s.scroll}
        contentContainerStyle={[s.scrollContent, { paddingBottom: 88 + insets.bottom }]}
        showsVerticalScrollIndicator={false}>
        {/* Header Section */}
        <View style={s.headerSection}>
          <View style={[s.largeAvatar, { backgroundColor: user.avatar }]}>
            <Text style={s.largeAvatarText}>{user.initials}</Text>
          </View>
          <Text style={s.userName}>{user.name}</Text>
          <Text style={s.userEmail}>{user.email}</Text>
        </View>

        {/* Profile Actions */}
        <View style={s.quickActionsSection}>
          <TouchableOpacity style={s.quickActionBtn} activeOpacity={0.7}>
            <Feather name="edit-2" size={18} color={C.white} />
            <Text style={s.quickActionBtnText}>Edit Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.quickActionBtn, s.quickActionBtnSecondary]} activeOpacity={0.7}>
            <Feather name="download" size={18} color={C.blue} />
            <Text style={[s.quickActionBtnText, { color: C.blue }]}>Download Data</Text>
          </TouchableOpacity>
        </View>

        {/* Account Section */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Account Settings</Text>
          <View style={s.sectionContent}>
            {settingsOptions.slice(0, 2).map((option, index) => (
              <TouchableOpacity
                key={index}
                style={[s.settingOption, index < 1 && s.settingOptionBorder]}
                onPress={option.onPress}
                activeOpacity={0.6}>
                <View style={s.settingIconWrapper}>
                  <Feather name={option.icon} size={20} color={C.blue} />
                </View>
                <View style={s.settingTextWrapper}>
                  <Text style={s.settingTitle}>{option.title}</Text>
                  <Text style={s.settingSubtitle}>{option.subtitle}</Text>
                </View>
                <Feather name="chevron-right" size={20} color={C.muted} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Preferences Section */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Preferences</Text>
          <View style={s.sectionContent}>
            {settingsOptions.slice(2, 4).map((option, index) => (
              <TouchableOpacity
                key={index}
                style={[s.settingOption, index < 1 && s.settingOptionBorder]}
                onPress={option.onPress}
                activeOpacity={0.6}>
                <View style={s.settingIconWrapper}>
                  <Feather name={option.icon} size={20} color={C.sage} />
                </View>
                <View style={s.settingTextWrapper}>
                  <Text style={s.settingTitle}>{option.title}</Text>
                  <Text style={s.settingSubtitle}>{option.subtitle}</Text>
                </View>
                <Feather name="chevron-right" size={20} color={C.muted} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* About Section */}
        <View style={s.section}>
          <View style={s.sectionContent}>
            <TouchableOpacity
              style={s.settingOption}
              onPress={settingsOptions[4].onPress}
              activeOpacity={0.6}>
              <View style={s.settingIconWrapper}>
                <Feather name={settingsOptions[4].icon} size={20} color={C.muted} />
              </View>
              <View style={s.settingTextWrapper}>
                <Text style={s.settingTitle}>{settingsOptions[4].title}</Text>
                <Text style={s.settingSubtitle}>{settingsOptions[4].subtitle}</Text>
              </View>
              <Feather name="chevron-right" size={20} color={C.muted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Logout Button */}
        <View style={s.logoutSection}>
          <TouchableOpacity style={s.logoutBtn} onPress={handleLogout} activeOpacity={0.75}>
            <Feather name="log-out" size={20} color={C.white} />
            <Text style={s.logoutBtnText}>Logout</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>

      <View
        style={[s.navOuter, { paddingBottom: Math.max(insets.bottom, 16) }]}
        pointerEvents="box-none">
        <View style={s.navPill}>
          {navItems.map(item => {
            const active = activeNav === item.key;
            return (
              <TouchableOpacity
                key={item.key}
                style={[s.navIconCircle, active ? s.navIconCircleActive : s.navIconCircleIdle]}
                onPress={() => {
                  if (item.key === 'scan') {
                    router.push('/camera');
                  } else if (item.key === 'history') {
                    router.push('/history');
                  } else if (item.key === 'home') {
                    router.push('/');
                  } else {
                    setActiveNav(item.key);
                  }
                }}
                activeOpacity={0.82}
                accessibilityRole="button"
                accessibilityLabel={item.a11y}
                accessibilityState={{ selected: active }}>
                <Feather
                  name={item.icon}
                  size={21}
                  color={active ? C.navIconActive : C.navIconInactive}
                />
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Change Password Modal */}
      <Modal visible={showChangePasswordModal} transparent animationType="slide">
        <SafeAreaView style={s.modalOverlay}>
          <View style={s.modalContent}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Change Password</Text>
              <TouchableOpacity
                onPress={() => setShowChangePasswordModal(false)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Close">
                <Feather name="x" size={24} color={C.text} />
              </TouchableOpacity>
            </View>

            <View style={s.modalInputGroup}>
              <Text style={s.inputLabel}>Current Password</Text>
              <TextInput
                style={s.input}
                placeholder="Enter current password"
                placeholderTextColor={C.muted}
                secureTextEntry
                value={currentPassword}
                onChangeText={setCurrentPassword}
                editable={!isLoading}
              />
            </View>

            <View style={s.modalInputGroup}>
              <Text style={s.inputLabel}>New Password</Text>
              <TextInput
                style={s.input}
                placeholder="Enter new password"
                placeholderTextColor={C.muted}
                secureTextEntry
                value={newPassword}
                onChangeText={setNewPassword}
                editable={!isLoading}
              />
            </View>

            <View style={s.modalInputGroup}>
              <Text style={s.inputLabel}>Confirm Password</Text>
              <TextInput
                style={s.input}
                placeholder="Confirm new password"
                placeholderTextColor={C.muted}
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                editable={!isLoading}
              />
            </View>

            <TouchableOpacity
              style={s.modalActionBtn}
              onPress={handleChangePassword}
              disabled={isLoading}
              activeOpacity={0.75}>
              {isLoading ? (
                <ActivityIndicator size="small" color={C.white} />
              ) : (
                <Text style={s.modalActionBtnText}>Update Password</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={s.modalCancelBtn}
              onPress={() => setShowChangePasswordModal(false)}
              disabled={isLoading}
              activeOpacity={0.75}>
              <Text style={s.modalCancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Change Email Modal */}
      <Modal visible={showChangeEmailModal} transparent animationType="slide">
        <SafeAreaView style={s.modalOverlay}>
          <View style={s.modalContent}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Change Email</Text>
              <TouchableOpacity
                onPress={() => setShowChangeEmailModal(false)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Close">
                <Feather name="x" size={24} color={C.text} />
              </TouchableOpacity>
            </View>

            <View style={s.modalInfo}>
              <Feather name="info" size={16} color={C.blue} />
              <Text style={s.modalInfoText}>
                We'll send a verification link to your new email address
              </Text>
            </View>

            <View style={s.modalInputGroup}>
              <Text style={s.inputLabel}>Current Email</Text>
              <View style={s.disabledInput}>
                <Text style={s.disabledInputText}>{user.email}</Text>
              </View>
            </View>

            <View style={s.modalInputGroup}>
              <Text style={s.inputLabel}>New Email</Text>
              <TextInput
                style={s.input}
                placeholder="Enter new email"
                placeholderTextColor={C.muted}
                keyboardType="email-address"
                value={newEmail}
                onChangeText={setNewEmail}
                editable={!isLoading}
              />
            </View>

            <TouchableOpacity
              style={s.modalActionBtn}
              onPress={handleChangeEmail}
              disabled={isLoading}
              activeOpacity={0.75}>
              {isLoading ? (
                <ActivityIndicator size="small" color={C.white} />
              ) : (
                <Text style={s.modalActionBtnText}>Update Email</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={s.modalCancelBtn}
              onPress={() => setShowChangeEmailModal(false)}
              disabled={isLoading}
              activeOpacity={0.75}>
              <Text style={s.modalCancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 8 },

  headerSection: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 22,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  largeAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    backgroundColor: C.purple,
  },
  largeAvatarText: {
    fontSize: 40,
    fontWeight: '700',
    color: C.white,
    fontFamily: Platform.select({ ios: undefined, android: 'sans-serif', default: undefined }),
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: C.text,
    marginBottom: 6,
    letterSpacing: -0.3,
    fontFamily: Platform.select({ ios: undefined, android: 'sans-serif', default: undefined }),
  },
  userEmail: {
    fontSize: 14,
    color: C.muted,
    fontFamily: Platform.select({ ios: undefined, android: 'sans-serif', default: undefined }),
  },

  quickActionsSection: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 22,
    paddingVertical: 16,
  },
  quickActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    backgroundColor: C.blue,
    borderRadius: 12,
  },
  quickActionBtnSecondary: {
    backgroundColor: C.blueLight,
  },
  quickActionBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: C.white,
    fontFamily: Platform.select({ ios: undefined, android: 'sans-serif', default: undefined }),
  },

  section: {
    paddingVertical: 16,
    paddingHorizontal: 22,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: C.text,
    marginBottom: 12,
    letterSpacing: -0.2,
    fontFamily: Platform.select({ ios: undefined, android: 'sans-serif', default: undefined }),
  },
  sectionContent: {
    backgroundColor: C.cardGray,
    borderRadius: 14,
    overflow: 'hidden',
  },

  settingOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 12,
  },
  settingOptionBorder: {
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  settingIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: C.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingTextWrapper: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: C.text,
    marginBottom: 2,
    fontFamily: Platform.select({ ios: undefined, android: 'sans-serif', default: undefined }),
  },
  settingSubtitle: {
    fontSize: 12,
    color: C.muted,
    fontFamily: Platform.select({ ios: undefined, android: 'sans-serif', default: undefined }),
  },

  logoutSection: {
    paddingHorizontal: 22,
    paddingVertical: 16,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    backgroundColor: '#E74C3C',
    borderRadius: 12,
  },
  logoutBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: C.white,
    fontFamily: Platform.select({ ios: undefined, android: 'sans-serif', default: undefined }),
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: C.bg,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: C.text,
    fontFamily: Platform.select({ ios: undefined, android: 'sans-serif', default: undefined }),
  },
  modalInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: C.blueLight,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 16,
  },
  modalInfoText: {
    flex: 1,
    fontSize: 12,
    color: C.blue,
    fontFamily: Platform.select({ ios: undefined, android: 'sans-serif', default: undefined }),
  },
  modalInputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: C.text,
    marginBottom: 6,
    fontFamily: Platform.select({ ios: undefined, android: 'sans-serif', default: undefined }),
  },
  input: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: C.text,
    fontFamily: Platform.select({ ios: undefined, android: 'sans-serif', default: undefined }),
  },
  disabledInput: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: C.cardGray,
  },
  disabledInputText: {
    fontSize: 14,
    color: C.muted,
    fontFamily: Platform.select({ ios: undefined, android: 'sans-serif', default: undefined }),
  },
  modalActionBtn: {
    paddingVertical: 14,
    backgroundColor: C.blue,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  modalActionBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: C.white,
    fontFamily: Platform.select({ ios: undefined, android: 'sans-serif', default: undefined }),
  },
  modalCancelBtn: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  modalCancelBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: C.blue,
    fontFamily: Platform.select({ ios: undefined, android: 'sans-serif', default: undefined }),
  },

  navOuter: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  navPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    backgroundColor: C.navPillBg,
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 12,
    gap: 22,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.05)',
    ...(Platform.OS === 'ios'
      ? {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
        }
      : Platform.OS === 'android'
        ? { elevation: 6 }
        : { boxShadow: '0 4px 20px rgba(0,0,0,0.07)' }),
  },
  navIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navIconCircleIdle: {
    backgroundColor: C.navCircleInactive,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  navIconCircleActive: {
    backgroundColor: C.navCircleActive,
    borderColor: C.navCircleActive,
  },
});
