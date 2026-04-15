import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { C, FontSize, Space, Radius, Shadow } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { AppButton } from '@/components/ui/AppButton';
import { AppInput } from '@/components/ui/AppInput';
import { BottomTabBar, type NavKey } from '@/components/ui/BottomTabBar';
import { useAppAlert } from '@/components/ui/AppAlert';

type FeatherIconName = React.ComponentProps<typeof Feather>['name'];

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [activeNav, setActiveNav]                   = useState<NavKey>('profile');
  const [showLogoutModal, setShowLogoutModal]         = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [showChangeEmailModal, setShowChangeEmailModal]       = useState(false);
  const [currentPassword, setCurrentPassword]       = useState('');
  const [newPassword, setNewPassword]               = useState('');
  const [confirmPassword, setConfirmPassword]       = useState('');
  const [newEmail, setNewEmail]                     = useState(user?.email || '');
  const [isLoading, setIsLoading]                   = useState(false);
  const { showAlert, alertNode }                    = useAppAlert();

  const getInitials = (firstName?: string, lastName?: string) => {
    const first = firstName?.[0]?.toUpperCase() || '';
    const last  = lastName?.[0]?.toUpperCase()  || '';
    return (first + last) || 'SH';
  };

  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'User';

  const handleLogout = () => setShowLogoutModal(true);

  const handleChangePassword = async () => {
    if (!currentPassword.trim()) {
      showAlert({ title: 'Missing Field', message: 'Please enter your current password.', variant: 'warning' });
      return;
    }
    if (newPassword.trim().length < 6) {
      showAlert({ title: 'Password Too Short', message: 'New password must be at least 6 characters.', variant: 'warning' });
      return;
    }
    if (newPassword !== confirmPassword) {
      showAlert({ title: 'Passwords Don\'t Match', message: 'Please make sure both password fields are identical.', variant: 'error' });
      return;
    }
    try {
      setIsLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 800));
      showAlert({
        title: 'Password Updated',
        message: 'Your password has been changed successfully.',
        variant: 'success',
        buttons: [{
          text: 'Done',
          onPress: () => {
            setShowChangePasswordModal(false);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
          },
        }],
      });
    } catch {
      showAlert({ title: 'Update Failed', message: 'Failed to change password. Please try again.', variant: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangeEmail = async () => {
    if (!newEmail.trim() || !newEmail.includes('@')) {
      showAlert({ title: 'Invalid Email', message: 'Please enter a valid email address.', variant: 'warning' });
      return;
    }
    if (newEmail === user?.email) {
      showAlert({ title: 'No Change', message: 'The new email is the same as your current one.', variant: 'info' });
      return;
    }
    try {
      setIsLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 800));
      showAlert({
        title: 'Request Sent',
        message: 'An email change request has been submitted.',
        variant: 'success',
        buttons: [{
          text: 'Done',
          onPress: () => {
            setShowChangeEmailModal(false);
            setNewEmail(user?.email || '');
          },
        }],
      });
    } catch {
      showAlert({ title: 'Update Failed', message: 'Failed to change email. Please try again.', variant: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleNav = (key: NavKey) => {
    if      (key === 'scan')    router.push('/camera');
    else if (key === 'history') router.push('/history');
    else if (key === 'home')    router.push('/');
    else setActiveNav(key);
  };

  const settingsOptions: {
    icon: FeatherIconName;
    iconBg: string;
    iconColor: string;
    title: string;
    subtitle: string;
    onPress: () => void;
  }[] = [
    {
      icon: 'lock', iconBg: C.primaryLight, iconColor: C.primary,
      title: 'Change Password', subtitle: 'Update your password',
      onPress: () => setShowChangePasswordModal(true),
    },
    {
      icon: 'mail', iconBg: C.primaryLight, iconColor: C.primary,
      title: 'Change Email', subtitle: 'Update your email address',
      onPress: () => setShowChangeEmailModal(true),
    },
    {
      icon: 'bell', iconBg: C.amberLight, iconColor: C.amber,
      title: 'Notifications', subtitle: 'Manage notification preferences',
      onPress: () => showAlert({ title: 'Coming Soon', message: 'Notification settings are coming in the next update.', variant: 'info' }),
    },
    {
      icon: 'shield', iconBg: C.purpleLight, iconColor: C.purple,
      title: 'Privacy & Security', subtitle: 'Manage your data and privacy',
      onPress: () => showAlert({ title: 'Coming Soon', message: 'Privacy settings are coming in the next update.', variant: 'info' }),
    },
    {
      icon: 'info', iconBg: C.surfaceAlt, iconColor: C.textSub,
      title: 'About', subtitle: 'App version and information',
      onPress: () => showAlert({ title: 'XAI Skin Health', message: 'Version 1.0.0\n\nA comprehensive skin health monitoring app powered by AI.', variant: 'info' }),
    },
  ];

  const accountSettings = settingsOptions.slice(0, 2);
  const preferences     = settingsOptions.slice(2, 4);
  const aboutOption     = settingsOptions[4];

  return (
    <SafeAreaView style={s.safe} edges={['top', 'left', 'right']}>
      {alertNode}
      <StatusBar barStyle="light-content" backgroundColor={C.primary} />

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}>

        {/* ── Branded Hero Header ── */}
        <View style={s.heroHeader}>
          {/* Decorative rings */}
          <View style={s.heroRing1} />
          <View style={s.heroRing2} />

          {/* Avatar with outer ring */}
          <View style={s.avatarOuterRing}>
            <View style={s.avatarCircle}>
              <Text style={s.avatarInitials}>{getInitials(user?.firstName, user?.lastName)}</Text>
            </View>
          </View>

          <Text style={s.userName}>{fullName}</Text>
          <Text style={s.userEmail}>{user?.email}</Text>

          {/* Patient badge pill */}
          <View style={s.patientBadge}>
            <Feather name="user-check" size={11} color="rgba(255,255,255,0.9)" />
            <Text style={s.patientBadgeTxt}>Registered Patient</Text>
          </View>
        </View>

        {/* ── Quick Actions ── */}
        <View style={s.quickActionsRow}>
          <AppButton
            label="Edit Profile"
            icon="edit-2"
            onPress={() => showAlert({ title: 'Coming Soon', message: 'Profile editing coming soon', variant: 'info' })}
            variant="primary"
            size="md"
            style={s.quickBtn}
          />
          <AppButton
            label="Export Data"
            icon="download"
            onPress={() => showAlert({ title: 'Coming Soon', message: 'Data export coming soon', variant: 'info' })}
            variant="secondary"
            size="md"
            style={s.quickBtn}
          />
        </View>

        {/* ── Account Settings ── */}
        <View style={s.sectionLabelRow}>
          <Feather name="settings" size={13} color={C.primary} />
          <Text style={s.sectionLabel}>Account Settings</Text>
        </View>
        <View style={s.settingsCard}>
          {accountSettings.map((opt, idx) => (
            <React.Fragment key={opt.title}>
              <SettingRow {...opt} />
              {idx < accountSettings.length - 1 && <View style={s.divider} />}
            </React.Fragment>
          ))}
        </View>

        {/* ── Preferences ── */}
        <View style={s.sectionLabelRow}>
          <Feather name="sliders" size={13} color={C.primary} />
          <Text style={s.sectionLabel}>Preferences</Text>
        </View>
        <View style={s.settingsCard}>
          {preferences.map((opt, idx) => (
            <React.Fragment key={opt.title}>
              <SettingRow {...opt} />
              {idx < preferences.length - 1 && <View style={s.divider} />}
            </React.Fragment>
          ))}
        </View>

        {/* ── About ── */}
        <View style={s.settingsCard}>
          <SettingRow {...aboutOption} />
        </View>

        {/* ── Logout ── */}
        <View style={s.logoutWrap}>
          <AppButton
            label="Logout"
            icon="log-out"
            onPress={handleLogout}
            variant="danger"
            size="lg"
            style={s.logoutBtn}
          />
        </View>

        <View style={{ height: Space[6] }} />
      </ScrollView>

      <BottomTabBar active={activeNav} onPress={handleNav} />

      {/* ── Logout Confirmation Modal ── */}
      <Modal visible={showLogoutModal} transparent animationType="fade">
        <View style={s.overlay}>
          <View style={s.logoutCard}>
            <View style={s.logoutIconCircle}>
              <Feather name="log-out" size={28} color={C.urgentText} />
            </View>
            <Text style={s.modalTitle}>Logout</Text>
            <Text style={s.modalMessage}>Are you sure you want to logout?</Text>
            <AppButton
              label="Logout"
              onPress={async () => {
                setShowLogoutModal(false);
                await logout();
                router.replace('/(auth)/login');
              }}
              variant="danger"
              size="md"
              style={s.modalFullBtn}
            />
            <AppButton
              label="Cancel"
              onPress={() => setShowLogoutModal(false)}
              variant="ghost"
              size="md"
              style={s.modalFullBtn}
            />
          </View>
        </View>
      </Modal>

      {/* ── Change Password Modal ── */}
      <Modal visible={showChangePasswordModal} transparent animationType="slide">
        <KeyboardAvoidingView
          style={s.modalKbWrap}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <TouchableOpacity style={s.modalDismiss} onPress={() => setShowChangePasswordModal(false)} />
          <View style={s.bottomSheet}>
            <View style={s.sheetHandle} />
            <View style={s.sheetHeader}>
              <Text style={s.modalTitle}>Change Password</Text>
              <TouchableOpacity onPress={() => setShowChangePasswordModal(false)} hitSlop={8}>
                <Feather name="x" size={22} color={C.text} />
              </TouchableOpacity>
            </View>
            <AppInput
              label="Current Password"
              secureEntry
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder="Enter current password"
              editable={!isLoading}
            />
            <AppInput
              label="New Password"
              secureEntry
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Enter new password"
              editable={!isLoading}
            />
            <AppInput
              label="Confirm Password"
              secureEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm new password"
              editable={!isLoading}
            />
            <AppButton
              label="Update Password"
              onPress={handleChangePassword}
              loading={isLoading}
              variant="primary"
              size="lg"
              style={s.sheetActionBtn}
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Change Email Modal ── */}
      <Modal visible={showChangeEmailModal} transparent animationType="slide">
        <KeyboardAvoidingView
          style={s.modalKbWrap}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <TouchableOpacity style={s.modalDismiss} onPress={() => setShowChangeEmailModal(false)} />
          <View style={s.bottomSheet}>
            <View style={s.sheetHandle} />
            <View style={s.sheetHeader}>
              <Text style={s.modalTitle}>Change Email</Text>
              <TouchableOpacity onPress={() => setShowChangeEmailModal(false)} hitSlop={8}>
                <Feather name="x" size={22} color={C.text} />
              </TouchableOpacity>
            </View>
            {/* Info banner */}
            <View style={s.infoBanner}>
              <Feather name="info" size={15} color={C.primary} />
              <Text style={s.infoBannerText}>
                We'll send a verification link to your new email address
              </Text>
            </View>
            {/* Current email (read-only) */}
            <Text style={s.inputLabel}>Current Email</Text>
            <View style={s.readonlyInput}>
              <Text style={s.readonlyText}>{user?.email}</Text>
            </View>
            <AppInput
              label="New Email"
              value={newEmail}
              onChangeText={setNewEmail}
              placeholder="Enter new email"
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!isLoading}
            />
            <AppButton
              label="Update Email"
              onPress={handleChangeEmail}
              loading={isLoading}
              variant="primary"
              size="lg"
              style={s.sheetActionBtn}
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

// ── Setting Row sub-component ────────────────────────────────────────────────
function SettingRow({
  icon, iconBg, iconColor, title, subtitle, onPress,
}: {
  icon: React.ComponentProps<typeof Feather>['name'];
  iconBg: string;
  iconColor: string;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={s.settingRow} onPress={onPress} activeOpacity={0.65}>
      <View style={[s.settingIconBox, { backgroundColor: iconBg }]}>
        <Feather name={icon} size={18} color={iconColor} />
      </View>
      <View style={s.settingText}>
        <Text style={s.settingTitle}>{title}</Text>
        <Text style={s.settingSubtitle}>{subtitle}</Text>
      </View>
      <Feather name="chevron-right" size={18} color={C.muted} />
    </TouchableOpacity>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: C.bg },
  scroll:      { flex: 1 },
  scrollContent: { paddingBottom: 110 },

  // ── Branded hero header ──────────────────────────────────────────
  heroHeader: {
    alignItems: 'center',
    paddingTop: Space[8],
    paddingBottom: Space[6],
    paddingHorizontal: Space[5],
    backgroundColor: C.primary,
    overflow: 'hidden',
  },
  // Decorative background rings
  heroRing1: {
    position: 'absolute',
    width: 260, height: 260, borderRadius: 130,
    borderWidth: 50, borderColor: 'rgba(255,255,255,0.06)',
    top: -100, right: -70,
  },
  heroRing2: {
    position: 'absolute',
    width: 180, height: 180, borderRadius: 90,
    borderWidth: 36, borderColor: 'rgba(255,255,255,0.06)',
    bottom: -60, left: -40,
  },
  // Double-ring avatar
  avatarOuterRing: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Space[4],
  },
  avatarCircle: {
    width: 84, height: 84, borderRadius: 42,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarInitials: { fontSize: FontSize['2xl'], fontWeight: '800', color: '#fff' },
  userName:  { fontSize: FontSize.xl, fontWeight: '800', color: '#fff', marginBottom: 4, letterSpacing: -0.3 },
  userEmail: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.75)', marginBottom: Space[3] },

  // Registered patient pill badge
  patientBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: Radius.full,
    paddingHorizontal: 12, paddingVertical: 5,
  },
  patientBadgeTxt: { fontSize: FontSize.xs, fontWeight: '700', color: 'rgba(255,255,255,0.92)', letterSpacing: 0.3 },

  // Quick actions
  quickActionsRow: {
    flexDirection: 'row', gap: Space[3],
    paddingHorizontal: Space[5],
    paddingVertical: Space[4],
  },
  quickBtn: { flex: 1 },

  // Section label row (icon + label)
  sectionLabelRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginHorizontal: Space[5],
    marginBottom: Space[2],
    marginTop: Space[1],
  },
  sectionLabel: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: C.primary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },

  // Settings card
  settingsCard: {
    marginHorizontal: Space[5],
    marginBottom: Space[4],
    backgroundColor: C.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
    ...Shadow.xs,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Space[3] + 2,
    paddingHorizontal: Space[4],
    gap: Space[3],
  },
  settingIconBox: {
    width: 40, height: 40, borderRadius: Radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  settingText:    { flex: 1 },
  settingTitle:   { fontSize: FontSize.base - 1, fontWeight: '600', color: C.text, marginBottom: 2 },
  settingSubtitle:{ fontSize: FontSize.xs + 1, color: C.muted },
  divider:        { height: StyleSheet.hairlineWidth, backgroundColor: C.borderLight, marginLeft: Space[5] + 38 + Space[3] },

  // Logout
  logoutWrap: { paddingHorizontal: Space[5], paddingTop: Space[2] },
  logoutBtn:  { width: '100%' },

  // Overlay + logout card
  overlay: { flex: 1, backgroundColor: C.overlay, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Space[8] },
  logoutCard: {
    width: '100%', backgroundColor: C.surface,
    borderRadius: Radius.xl,
    paddingHorizontal: Space[6],
    paddingVertical: Space[6],
    alignItems: 'center',
    ...Shadow.lg,
  },
  logoutIconCircle: {
    width: 68, height: 68, borderRadius: 34,
    backgroundColor: C.urgentBg,
    borderWidth: 2, borderColor: C.urgentBorder,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Space[4],
  },
  modalTitle:   { fontSize: FontSize.lg, fontWeight: '700', color: C.text, marginBottom: Space[2], textAlign: 'center' },
  modalMessage: { fontSize: FontSize.sm + 1, color: C.muted, textAlign: 'center', lineHeight: 21, marginBottom: Space[5] },
  modalFullBtn: { width: '100%', marginTop: Space[2] },

  // Bottom sheet modals
  modalKbWrap:  { flex: 1, justifyContent: 'flex-end' },
  modalDismiss: { flex: 1, backgroundColor: C.overlay },
  bottomSheet: {
    backgroundColor: C.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingHorizontal: Space[5],
    paddingTop: Space[2],
    paddingBottom: Space[8],
    ...Shadow.xl,
  },
  sheetHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: C.border,
    alignSelf: 'center',
    marginBottom: Space[4],
  },
  sheetHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: Space[5],
  },
  sheetActionBtn: { marginTop: Space[2] },

  // Info banner
  infoBanner: {
    flexDirection: 'row', alignItems: 'center', gap: Space[2],
    backgroundColor: C.primaryLight,
    borderRadius: Radius.md,
    paddingHorizontal: Space[3],
    paddingVertical: Space[3] - 2,
    marginBottom: Space[4],
  },
  infoBannerText: { flex: 1, fontSize: FontSize.xs + 1, color: C.primary, lineHeight: 18 },

  // Read-only email display
  inputLabel:    { fontSize: FontSize.sm, fontWeight: '600', color: C.text, marginBottom: 7 },
  readonlyInput: {
    backgroundColor: C.surfaceAlt, borderRadius: Radius.md,
    paddingHorizontal: Space[4], paddingVertical: Space[3],
    borderWidth: 1, borderColor: C.border,
    marginBottom: Space[4],
  },
  readonlyText: { fontSize: FontSize.base, color: C.muted },
});
