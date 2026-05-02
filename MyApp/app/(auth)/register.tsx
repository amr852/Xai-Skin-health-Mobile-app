// app/(auth)/register.tsx
import {
  View, Text, TouchableOpacity, StyleSheet, StatusBar,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, router } from 'expo-router';
import { useState } from 'react';
import { C, FontFamily, Shadow } from '@/constants/theme';
import Feather from '@expo/vector-icons/Feather';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useAuth } from '@/hooks/useAuth';
import { AppInput } from '@/components/ui/AppInput';
import { AppButton } from '@/components/ui/AppButton';
import { Crest } from '@/components/decor/Crest';
import { ArrowLeft, AlertCircle } from 'lucide-react-native';

type Gender = 'male' | 'female' | null;

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

      {/* Top utility bar — back always lands on welcome */}
      <View style={s.topBar}>
        <TouchableOpacity
          onPress={() => router.replace('/(auth)/welcome')}
          style={s.backBtn}
          hitSlop={10}
          accessibilityLabel="Back to welcome">
          <ArrowLeft size={20} color={C.text} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>

          {/* Editorial heading */}
          <View style={s.headingBlock}>
            <Crest size={48} />
            <View style={{ height: 24 }} />
            <Text style={s.eyebrow}>NEW ACCOUNT</Text>
            <Text style={s.heading}>Create your account.</Text>
            <Text style={s.subheading}>
              A small profile keeps your records private and consistent over time.
            </Text>
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
                  placeholder="Lily"
                  editable={!isLoading}
                />
              </View>
              <View style={s.nameHalf}>
                <AppInput
                  label="Last Name"
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder="Bloom"
                  editable={!isLoading}
                />
              </View>
            </View>

            <AppInput
              label="Email address"
              value={email}
              onChangeText={setEmail}
              placeholder="petal.bloom@example.com"
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
                <AlertCircle size={14} color={C.urgentText} strokeWidth={2} />
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

  // ── Top utility bar ─────────────────────────────────────────────
  topBar: {
    paddingHorizontal: 12, paddingVertical: 8,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: C.surfaceAlt,
    borderWidth: 1, borderColor: C.borderLight,
    alignItems: 'center', justifyContent: 'center',
  },

  scroll: { paddingHorizontal: 20, paddingBottom: 40 },

  // ── Heading block ───────────────────────────────────────────────
  headingBlock: { alignItems: 'flex-start', paddingTop: 8, paddingBottom: 22 },
  eyebrow: {
    fontSize: 11,
    fontFamily: FontFamily.bodyBold,
    color: C.primary,
    letterSpacing: 1.6,
    marginBottom: 8,
  },
  heading: {
    fontSize: 28,
    fontFamily: FontFamily.bodyBold,
    color: C.text,
    letterSpacing: -0.6,
    marginBottom: 8,
  },
  subheading: {
    fontSize: 14,
    fontFamily: FontFamily.body,
    color: C.textSub,
    lineHeight: 20,
    maxWidth: 320,
  },

  // ── Form card ───────────────────────────────────────────────────
  card: {
    backgroundColor: C.surface,
    borderRadius: 22, padding: 22,
    borderWidth: 1, borderColor: C.border,
    marginBottom: 24,
    ...(Platform.OS === 'ios' ? Shadow.sm : Platform.OS === 'android' ? { elevation: 3 } : {}),
  },

  nameRow: { flexDirection: 'row', gap: 10, marginBottom: 0 },
  nameHalf: { flex: 1, minWidth: 0 },

  // ── Gender ──────────────────────────────────────────────────────
  fieldBlock: { marginBottom: 4 },
  fieldLabel: {
    fontSize: 13,
    fontFamily: FontFamily.bodySemibold,
    color: C.text,
    marginBottom: 7,
    letterSpacing: 0.1,
  },

  genderRow: { flexDirection: 'row', gap: 10 },
  genderBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 12, borderRadius: 16,
    borderWidth: 1.5, borderColor: C.border,
    backgroundColor: C.surface,
  },
  genderBtnActive: { backgroundColor: C.primary, borderColor: C.primary },
  genderBtnTxt: {
    fontSize: 14,
    fontFamily: FontFamily.bodySemibold,
    color: C.textHint,
  },
  genderBtnTxtActive: { color: '#fff' },

  // ── Date picker ─────────────────────────────────────────────────
  dateBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1.5, borderColor: C.border,
    backgroundColor: C.surface, borderRadius: 16,
    paddingHorizontal: 12, paddingVertical: 11,
  },
  dateBtnOpen: { borderColor: C.primary },
  dateIconBg: {
    width: 30, height: 30, borderRadius: 10,
    backgroundColor: C.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  dateBtnTxt: {
    flex: 1,
    fontSize: 14,
    fontFamily: FontFamily.bodyMedium,
    color: C.text,
  },
  datePlaceholder: {
    color: C.textHint,
    fontFamily: FontFamily.body,
  },

  // ── Calendar box ────────────────────────────────────────────────
  calBox: {
    marginTop: 10,
    backgroundColor: C.surface,
    borderWidth: 1, borderColor: C.border,
    borderRadius: 16, padding: 14,
    ...(Platform.OS === 'ios' ? Shadow.sm : Platform.OS === 'android' ? { elevation: 2 } : {}),
  },
  calHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  calNavBtn: {
    width: 34, height: 34, borderRadius: 11,
    backgroundColor: C.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  calTitleWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  calMonth: {
    fontSize: 16,
    fontFamily: FontFamily.displayBold,
    color: C.text,
  },
  yearPill: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 10, paddingVertical: 4,
    backgroundColor: C.primaryLight, borderRadius: 9,
  },
  calYear: {
    fontSize: 15,
    fontFamily: FontFamily.bodySemibold,
    color: C.primary,
  },

  yearDrop: {
    backgroundColor: C.surface,
    borderWidth: 1, borderColor: C.border,
    borderRadius: 12, overflow: 'hidden',
    marginBottom: 10,
    ...(Platform.OS === 'ios' ? Shadow.sm : Platform.OS === 'android' ? { elevation: 4 } : {}),
  },
  yrOpt: { alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.borderLight },
  yrOptSel: { backgroundColor: C.primary },
  yrTxt: {
    fontSize: 13,
    fontFamily: FontFamily.bodyMedium,
    color: C.text,
  },
  yrTxtSel: {
    color: '#fff',
    fontFamily: FontFamily.bodyBold,
  },

  weekRow: { flexDirection: 'row', marginBottom: 6 },
  weekLbl: {
    flex: 1, textAlign: 'center',
    fontSize: 11,
    fontFamily: FontFamily.bodyBold,
    color: C.textHint,
    letterSpacing: 0.4,
  },

  dayGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  emptyCell: { width: '14.28%', aspectRatio: 1 },
  dayCell: { width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 11 },
  dayCellSel: { backgroundColor: C.primary },
  dayCellOff: { opacity: 0.35 },
  dayTxt: {
    fontSize: 13,
    fontFamily: FontFamily.bodyMedium,
    color: C.text,
  },
  dayTxtSel: {
    color: '#fff',
    fontFamily: FontFamily.bodyBold,
  },
  dayTxtOff: { color: C.muted },

  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.urgentBg, borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 11,
    borderLeftWidth: 3, borderLeftColor: C.urgentText,
    marginBottom: 4,
  },
  errorTxt: {
    flex: 1,
    color: C.urgentText,
    fontSize: 13,
    fontFamily: FontFamily.bodyMedium,
  },

  submitBtn: { marginTop: 10 },

  divider: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: C.border },
  dividerTxt: {
    paddingHorizontal: 12,
    fontSize: 12,
    fontFamily: FontFamily.body,
    color: C.textHint,
  },

  loginBtn: {
    height: 52, borderRadius: 18,
    borderWidth: 1.5, borderColor: C.primary,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: C.surface,
  },
  loginBtnTxt: {
    fontSize: 15,
    fontFamily: FontFamily.bodyBold,
    color: C.primary,
    letterSpacing: 0.2,
  },
});
