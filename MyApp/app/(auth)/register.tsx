// app/(auth)/register.tsx
import {
  View, Text, TouchableOpacity, StyleSheet, StatusBar,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, router } from 'expo-router';
import { useState } from 'react';
import { C } from '@/constants/theme';
import Feather from '@expo/vector-icons/Feather';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useAuth } from '@/hooks/useAuth';
import { AppInput } from '@/components/ui/AppInput';
import { AppButton } from '@/components/ui/AppButton';

type Gender = 'male' | 'female' | null;
type FeatherIconName = React.ComponentProps<typeof Feather>['name'];

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function RegisterScreen() {
  const [email, setEmail]                   = useState('');
  const [password, setPassword]             = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName]           = useState('');
  const [lastName, setLastName]             = useState('');
  const [gender, setGender]                 = useState<Gender>(null);
  const [selectedDate, setSelectedDate]     = useState<Date | null>(null);
  const [calendarDate, setCalendarDate]     = useState(new Date(new Date().getFullYear() - 18, new Date().getMonth(), 1));
  const [showCalendar, setShowCalendar]     = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [error, setError]                   = useState('');
  const { register, isLoading }             = useAuth();

  const getDaysInMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1).getDay();

  const handleDateSelect = (day: number) => {
    const newDate = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), day);
    if (newDate <= new Date()) { setSelectedDate(newDate); setShowCalendar(false); }
  };

  const handlePrevMonth = () =>
    setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1));

  const handleNextMonth = () => {
    const now = new Date();
    const next = new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1);
    if (next.getFullYear() < now.getFullYear() ||
        (next.getFullYear() === now.getFullYear() && next.getMonth() <= now.getMonth())) {
      setCalendarDate(next);
    }
  };

  const handleYearSelect = (year: number) => {
    setCalendarDate(new Date(year, calendarDate.getMonth(), 1));
    setShowYearPicker(false);
  };

  const handleRegister = async () => {
    setError('');
    if (!email.trim() || !password.trim() || !confirmPassword.trim() || !firstName.trim() || !lastName.trim() || !gender || !selectedDate) {
      setError('Please fill in all fields.'); return;
    }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }

    const result = await register(email.trim(), password, firstName, lastName, gender, selectedDate.toISOString());
    if (result.success) {
      router.replace('/(tabs)');
    } else {
      setError(result.error || 'Registration failed. Please try again.');
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={C.primary} />

      {/* ── Branded top stripe ── */}
      <View style={s.topStripe}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} hitSlop={10}>
          <Feather name="arrow-left" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={s.stripeLogo}>XAI Skin Health</Text>
        <View style={{ width: 36 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>

          {/* ── Heading block ── */}
          <View style={s.headingBlock}>
            <View style={s.iconRing}>
              <View style={s.iconCircle}>
                <Feather name="user-plus" size={26} color={C.primary} />
              </View>
            </View>
            <Text style={s.heading}>Create Account</Text>
            <Text style={s.subheading}>Join XAI Skin Health to start monitoring your skin today</Text>

            <View style={s.credBar}>
              {([
                { icon: 'shield',   label: 'Secure'   },
                { icon: 'eye-off',  label: 'Private'  },
                { icon: 'activity', label: 'Clinical' },
              ] as { icon: FeatherIconName; label: string }[]).map(item => (
                <View key={item.label} style={s.credItem}>
                  <Feather name={item.icon} size={12} color={C.primary} />
                  <Text style={s.credLabel}>{item.label}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* ── Form card ── */}
          <View style={s.card}>

            {/* Name row */}
            <View style={s.nameRow}>
              <View style={s.nameHalf}>
                <AppInput
                  label="First Name"
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder="First"
                  editable={!isLoading}
                />
              </View>
              <View style={s.nameHalf}>
                <AppInput
                  label="Last Name"
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder="Last"
                  editable={!isLoading}
                />
              </View>
            </View>

            <AppInput
              label="Email address"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!isLoading}
            />
            <AppInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="At least 6 characters"
              secureEntry
              editable={!isLoading}
            />
            <AppInput
              label="Confirm Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Repeat your password"
              secureEntry
              editable={!isLoading}
            />

            {/* Gender selector */}
            <View style={s.fieldBlock}>
              <Text style={s.fieldLabel}>Gender</Text>
              <View style={s.genderRow}>
                {(['male', 'female'] as Gender[]).map(g => (
                  <TouchableOpacity
                    key={g!}
                    style={[s.genderBtn, gender === g && s.genderBtnActive]}
                    onPress={() => setGender(g)}
                    disabled={isLoading}
                    activeOpacity={0.75}>
                    <MaterialCommunityIcons
                      name={g === 'male' ? 'gender-male' : 'gender-female'}
                      size={16}
                      color={gender === g ? '#fff' : C.textHint}
                    />
                    <Text style={[s.genderBtnTxt, gender === g && s.genderBtnTxtActive]}>
                      {g === 'male' ? 'Male' : 'Female'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Birth date picker */}
            <View style={s.fieldBlock}>
              <Text style={s.fieldLabel}>Birth Date</Text>
              <TouchableOpacity
                style={[s.dateBtn, showCalendar && s.dateBtnOpen]}
                onPress={() => { setShowCalendar(v => !v); setShowYearPicker(false); }}
                disabled={isLoading}
                activeOpacity={0.8}>
                <View style={s.dateIconBg}>
                  <Feather name="calendar" size={15} color={C.primary} />
                </View>
                <Text style={[s.dateBtnTxt, !selectedDate && s.datePlaceholder]}>
                  {selectedDate
                    ? selectedDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                    : 'Select your birth date'}
                </Text>
                <Feather name={showCalendar ? 'chevron-up' : 'chevron-down'} size={16} color={C.textHint} />
              </TouchableOpacity>

              {showCalendar && (
                <View style={s.calBox}>
                  {/* Calendar header */}
                  <View style={s.calHead}>
                    <TouchableOpacity onPress={handlePrevMonth} style={s.calNavBtn} hitSlop={8}>
                      <Feather name="chevron-left" size={18} color={C.primary} />
                    </TouchableOpacity>

                    <View style={s.calTitleWrap}>
                      <Text style={s.calMonth}>{MONTHS[calendarDate.getMonth()]}</Text>
                      <TouchableOpacity onPress={() => setShowYearPicker(v => !v)} style={s.yearPill} activeOpacity={0.75}>
                        <Text style={s.calYear}>{calendarDate.getFullYear()}</Text>
                        <Feather name={showYearPicker ? 'chevron-up' : 'chevron-down'} size={13} color={C.primary} />
                      </TouchableOpacity>
                    </View>

                    <TouchableOpacity onPress={handleNextMonth} style={s.calNavBtn} hitSlop={8}>
                      <Feather name="chevron-right" size={18} color={C.primary} />
                    </TouchableOpacity>
                  </View>

                  {/* Year dropdown */}
                  {showYearPicker && (
                    <View style={s.yearDrop}>
                      <ScrollView style={{ maxHeight: 180 }} showsVerticalScrollIndicator={false}>
                        {Array.from({ length: new Date().getFullYear() - 1900 + 1 }).map((_, idx) => {
                          const yr = new Date().getFullYear() - idx;
                          const sel = yr === calendarDate.getFullYear();
                          return (
                            <TouchableOpacity key={yr} style={[s.yrOpt, sel && s.yrOptSel]} onPress={() => handleYearSelect(yr)}>
                              <Text style={[s.yrTxt, sel && s.yrTxtSel]}>{yr}</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    </View>
                  )}

                  {/* Weekday row */}
                  <View style={s.weekRow}>
                    {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
                      <Text key={d} style={s.weekLbl}>{d}</Text>
                    ))}
                  </View>

                  {/* Day grid */}
                  <View style={s.dayGrid}>
                    {Array.from({ length: getFirstDayOfMonth(calendarDate) }).map((_, i) => (
                      <View key={`e${i}`} style={s.emptyCell} />
                    ))}
                    {Array.from({ length: getDaysInMonth(calendarDate) }).map((_, i) => {
                      const day = i + 1;
                      const date = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), day);
                      const isSel = selectedDate?.toDateString() === date.toDateString();
                      const isOff = date > new Date();
                      return (
                        <TouchableOpacity
                          key={day}
                          style={[s.dayCell, isSel && s.dayCellSel, isOff && s.dayCellOff]}
                          onPress={() => !isOff && handleDateSelect(day)}
                          disabled={isOff}
                          activeOpacity={0.75}>
                          <Text style={[s.dayTxt, isSel && s.dayTxtSel, isOff && s.dayTxtOff]}>{day}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}
            </View>

            {/* Error box */}
            {error ? (
              <View style={s.errorBox}>
                <Feather name="alert-circle" size={14} color={C.urgentText} />
                <Text style={s.errorTxt}>{error}</Text>
              </View>
            ) : null}

            <AppButton
              label="Create Account"
              onPress={handleRegister}
              loading={isLoading}
              icon="user-plus"
              iconRight
              size="lg"
              style={s.submitBtn}
            />
          </View>

          {/* ── Divider ── */}
          <View style={s.divider}>
            <View style={s.dividerLine} />
            <Text style={s.dividerTxt}>Already registered?</Text>
            <View style={s.dividerLine} />
          </View>

          <Link href="/(auth)/login" asChild>
            <TouchableOpacity style={s.loginBtn} activeOpacity={0.8}>
              <Feather name="log-in" size={16} color={C.primary} />
              <Text style={s.loginBtnTxt}>Sign in instead</Text>
            </TouchableOpacity>
          </Link>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },

  // ── Branded top stripe ──────────────────────────────────────────
  topStripe: {
    backgroundColor: C.primary,
    paddingHorizontal: 16, paddingVertical: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  stripeLogo: { fontSize: 15, fontWeight: '700', color: '#fff', letterSpacing: -0.2 },

  scroll: { paddingHorizontal: 20, paddingBottom: 40 },

  // ── Heading block ───────────────────────────────────────────────
  headingBlock: { alignItems: 'center', paddingTop: 24, paddingBottom: 20 },

  iconRing: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: C.primaryLight,
    borderWidth: 1.5, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
    ...(Platform.OS === 'ios'
      ? { shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 }
      : Platform.OS === 'android' ? { elevation: 3 } : {}),
  },
  iconCircle: {
    width: 58, height: 58, borderRadius: 16,
    backgroundColor: C.surface,
    borderWidth: 1, borderColor: C.borderLight,
    alignItems: 'center', justifyContent: 'center',
  },

  heading: { fontSize: 26, fontWeight: '800', color: C.text, letterSpacing: -0.5, marginBottom: 8, textAlign: 'center' },
  subheading: { fontSize: 14, color: C.textHint, textAlign: 'center', lineHeight: 21, marginBottom: 16 },

  credBar: { flexDirection: 'row', gap: 8, marginTop: 4 },
  credItem: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: C.primaryLight,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 9999, borderWidth: 1, borderColor: C.border,
  },
  credLabel: { fontSize: 11, fontWeight: '600', color: C.primary },

  // ── Form card ───────────────────────────────────────────────────
  card: {
    backgroundColor: C.surface,
    borderRadius: 20, padding: 20,
    borderWidth: 1, borderColor: C.border,
    marginBottom: 24,
    ...(Platform.OS === 'ios'
      ? { shadowColor: '#1E1010', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.07, shadowRadius: 10 }
      : Platform.OS === 'android' ? { elevation: 3 } : {}),
  },

  nameRow: { flexDirection: 'row', gap: 10, marginBottom: 0 },
  nameHalf: { flex: 1, minWidth: 0 },

  // ── Gender ──────────────────────────────────────────────────────
  fieldBlock: { marginBottom: 2 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: C.text, marginBottom: 6 },

  genderRow: { flexDirection: 'row', gap: 10 },
  genderBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 11, borderRadius: 12,
    borderWidth: 1.5, borderColor: C.border,
    backgroundColor: C.surface,
  },
  genderBtnActive: { backgroundColor: C.primary, borderColor: C.primary },
  genderBtnTxt: { fontSize: 14, fontWeight: '600', color: C.textHint },
  genderBtnTxtActive: { color: '#fff' },

  // ── Date picker ─────────────────────────────────────────────────
  dateBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1.5, borderColor: C.border,
    backgroundColor: C.surface, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 11,
  },
  dateBtnOpen: { borderColor: C.primary },
  dateIconBg: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: C.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  dateBtnTxt: { flex: 1, fontSize: 14, color: C.text, fontWeight: '500' },
  datePlaceholder: { color: C.textHint, fontWeight: '400' },

  // ── Calendar box ────────────────────────────────────────────────
  calBox: {
    marginTop: 10,
    backgroundColor: C.surface,
    borderWidth: 1, borderColor: C.border,
    borderRadius: 14, padding: 14,
    ...(Platform.OS === 'ios'
      ? { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8 }
      : Platform.OS === 'android' ? { elevation: 2 } : {}),
  },
  calHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  calNavBtn: {
    width: 32, height: 32, borderRadius: 9,
    backgroundColor: C.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  calTitleWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  calMonth: { fontSize: 16, fontWeight: '700', color: C.text },
  yearPill: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 9, paddingVertical: 4,
    backgroundColor: C.primaryLight, borderRadius: 8,
  },
  calYear: { fontSize: 15, fontWeight: '600', color: C.primary },

  // Year dropdown
  yearDrop: {
    backgroundColor: C.surface,
    borderWidth: 1, borderColor: C.border,
    borderRadius: 10, overflow: 'hidden',
    marginBottom: 10,
    ...(Platform.OS === 'ios'
      ? { shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.1, shadowRadius: 6 }
      : Platform.OS === 'android' ? { elevation: 4 } : {}),
  },
  yrOpt: { alignItems: 'center', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: C.border },
  yrOptSel: { backgroundColor: C.primary },
  yrTxt: { fontSize: 13, fontWeight: '500', color: C.text },
  yrTxtSel: { color: '#fff', fontWeight: '700' },

  // Weekdays
  weekRow: { flexDirection: 'row', marginBottom: 6 },
  weekLbl: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '700', color: C.textHint },

  // Day grid
  dayGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  emptyCell: { width: '14.28%', aspectRatio: 1 },
  dayCell: { width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 9 },
  dayCellSel: { backgroundColor: C.primary },
  dayCellOff: { opacity: 0.35 },
  dayTxt: { fontSize: 13, fontWeight: '500', color: C.text },
  dayTxtSel: { color: '#fff', fontWeight: '700' },
  dayTxtOff: { color: C.muted },

  // ── Error box ───────────────────────────────────────────────────
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.urgentBg, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 11,
    borderLeftWidth: 3, borderLeftColor: C.urgentText,
    marginBottom: 4,
  },
  errorTxt: { flex: 1, color: C.urgentText, fontSize: 13, fontWeight: '500' },

  submitBtn: { marginTop: 8 },

  // ── Bottom ──────────────────────────────────────────────────────
  divider: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: C.border },
  dividerTxt: { paddingHorizontal: 12, fontSize: 12, color: C.textHint },

  loginBtn: {
    height: 52, borderRadius: 14,
    borderWidth: 1.5, borderColor: C.primary,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: C.surface,
  },
  loginBtnTxt: { fontSize: 15, fontWeight: '700', color: C.primary },
});
