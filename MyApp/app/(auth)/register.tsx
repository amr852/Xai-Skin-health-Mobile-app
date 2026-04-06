// app/(auth)/register.tsx
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, StatusBar, ActivityIndicator, Platform, ScrollView, Modal } from 'react-native';
import { Link, router } from 'expo-router';
import { useState } from 'react';
import { C } from '@/constants/theme';
import Feather from '@expo/vector-icons/Feather';
import { useAuth } from '@/hooks/useAuth';

type Gender = 'male' | 'female' | null;

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [gender, setGender] = useState<Gender>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [calendarDate, setCalendarDate] = useState(new Date(new Date().getFullYear() - 18, new Date().getMonth(), 1));
  const [showCalendar, setShowCalendar] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [error, setError] = useState('');
  const { register, isLoading } = useAuth();

  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const handleDateSelect = (day: number) => {
    const newDate = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), day);
    if (newDate <= new Date()) {
      setSelectedDate(newDate);
      setShowCalendar(false);
    }
  };

  const handlePrevMonth = () => {
    setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
  const now = new Date();
const nextMonth = new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1);
if (nextMonth.getFullYear() < now.getFullYear() ||
   (nextMonth.getFullYear() === now.getFullYear() && nextMonth.getMonth() <= now.getMonth())) {
      setCalendarDate(nextMonth);
    }
  };

  const handleYearSelect = (year: number) => {
    setCalendarDate(new Date(year, calendarDate.getMonth(), 1));
    setShowYearPicker(false);
  };

  const handleRegister = async () => {
    setError('');

    if (!email.trim() || !password.trim() || !confirmPassword.trim() || !firstName.trim() || !lastName.trim() || !gender || !selectedDate) {
      setError('Please fill in all fields.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    const result = await register(
  email.trim(), password, firstName, lastName, gender,
  selectedDate.toISOString()  // ← serialize to string
);
    
    if (result.success) {
      router.replace('/(tabs)');
    } else {
      setError(result.error || 'Registration failed. Please try again.');
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
      <ScrollView
        style={s.scrollView}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={s.container}>
          <View style={s.card}>
           <View style={s.headerIconWrapper}>
  <View style={s.headerIconBg} />
  <Feather name="user-plus" size={32} color={C.sage} />
</View>

            <View style={s.header}>
              <Text style={s.title}>Create Account</Text>
              <Text style={s.subtitle}>Join us to start tracking</Text>
            </View>

            <View style={s.form}>
              <View style={s.inputGroup}>
                <Text style={s.label}>First Name</Text>
                <TextInput
                  style={s.input}
                  placeholder="Enter your first name"
                  placeholderTextColor={C.muted}
                  value={firstName}
                  onChangeText={setFirstName}
                  editable={!isLoading}
                />
              </View>

              <View style={s.inputGroup}>
                <Text style={s.label}>Last Name</Text>
                <TextInput
                  style={s.input}
                  placeholder="Enter your last name"
                  placeholderTextColor={C.muted}
                  value={lastName}
                  onChangeText={setLastName}
                  editable={!isLoading}
                />
              </View>

              <View style={s.inputGroup}>
                <Text style={s.label}>Email</Text>
                <TextInput
                  style={s.input}
                  placeholder="Enter your email"
                  placeholderTextColor={C.muted}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  editable={!isLoading}
                />
              </View>

              <View style={s.inputGroup}>
                <Text style={s.label}>Password</Text>
                <TextInput
                  style={s.input}
                  placeholder="Enter a password"
                  placeholderTextColor={C.muted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  editable={!isLoading}
                />
              </View>

              <View style={s.inputGroup}>
                <Text style={s.label}>Confirm Password</Text>
                <TextInput
                  style={s.input}
                  placeholder="Confirm your password"
                  placeholderTextColor={C.muted}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  editable={!isLoading}
                />
              </View>

              <View style={s.inputGroup}>
                <Text style={s.label}>Gender</Text>
                <View style={s.genderContainer}>
                  <TouchableOpacity
                    style={s.genderOption}
                    onPress={() => setGender('male')}
                    disabled={isLoading}
                    activeOpacity={0.7}>
                    <View style={[s.radio, gender === 'male' && s.radioSelected]}>
                      {gender === 'male' && <View style={s.radioDot} />}
                    </View>
                    <Text style={s.genderLabel}>Male</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={s.genderOption}
                    onPress={() => setGender('female')}
                    disabled={isLoading}
                    activeOpacity={0.7}>
                    <View style={[s.radio, gender === 'female' && s.radioSelected]}>
                      {gender === 'female' && <View style={s.radioDot} />}
                    </View>
                    <Text style={s.genderLabel}>Female</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={s.inputGroup}>
                <Text style={s.label}>Birth Date</Text>
                <TouchableOpacity
                  style={s.datePickerButton}
                  onPress={() => setShowCalendar(!showCalendar)}
                  disabled={isLoading}
                  activeOpacity={0.7}>
                  <Feather name="calendar" size={18} color={C.blue} />
                  <Text style={[s.datePickerText, !selectedDate && { color: C.muted }]}>
                    {selectedDate ? selectedDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'Select your birth date'}
                  </Text>
                </TouchableOpacity>

                {showCalendar && (
                  <View style={s.calendarContainer}>
                    <View style={s.calendarHeader}>
                      <TouchableOpacity onPress={handlePrevMonth} style={s.calendarNavButton}>
                        <Feather name="chevron-left" size={20} color={C.blue} />
                      </TouchableOpacity>
                      <View style={s.calendarTitleContainer}>
                        <Text style={s.calendarTitle}>
                          {months[calendarDate.getMonth()]}
                        </Text>
                        <TouchableOpacity onPress={() => setShowYearPicker(true)} style={s.yearSelector}>
                          <Text style={s.calendarYear}>{calendarDate.getFullYear()}</Text>
                          <Feather name="chevron-down" size={16} color={C.blue} />
                        </TouchableOpacity>
                      </View>
                      <TouchableOpacity onPress={handleNextMonth} style={s.calendarNavButton}>
                        <Feather name="chevron-right" size={20} color={calendarDate > new Date() ? C.muted : C.blue} />
                      </TouchableOpacity>
                    </View>

                    {showYearPicker && (
                      <View style={s.yearPickerOverlay}>
                        <ScrollView style={s.yearPickerList} showsVerticalScrollIndicator={false}>
                          {Array.from({ length: new Date().getFullYear() - 1900 + 1 }).map((_, index) => {
                            const year = new Date().getFullYear() - index;
                            const isSelected = year === calendarDate.getFullYear();
                            return (
                              <TouchableOpacity
                                key={year}
                                style={[s.yearOption, isSelected && s.yearOptionSelected]}
                                onPress={() => handleYearSelect(year)}>
                                <Text style={[s.yearOptionText, isSelected && s.yearOptionTextSelected]}>
                                  {year}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </ScrollView>
                      </View>
                    )}

                    <View style={s.weekDaysContainer}>
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                        <Text key={day} style={s.weekDay}>
                          {day}
                        </Text>
                      ))}
                    </View>

                    <View style={s.daysContainer}>
                      {Array.from({ length: getFirstDayOfMonth(calendarDate) }).map((_, index) => (
                        <View key={`empty-${index}`} style={s.emptyDay} />
                      ))}
                      {Array.from({ length: getDaysInMonth(calendarDate) }).map((_, index) => {
                        const day = index + 1;
                        const date = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), day);
                        const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString();
                        const isDisabled = date > new Date();

                        return (
                          <TouchableOpacity
                            key={day}
                            style={[
                              s.dayButton,
                              isSelected && s.dayButtonSelected,
                              isDisabled && s.dayButtonDisabled,
                            ]}
                            onPress={() => !isDisabled && handleDateSelect(day)}
                            disabled={isDisabled}>
                            <Text style={[s.dayText, isSelected && s.dayTextSelected, isDisabled && s.dayTextDisabled]}>
                              {day}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                )}
              </View>

              {error ? <Text style={s.errorText}>{error}</Text> : null}

              <TouchableOpacity
                style={[s.button, isLoading && s.buttonDisabled]}
                onPress={handleRegister}
                disabled={isLoading}
                activeOpacity={0.75}>
                {isLoading ? (
                  <ActivityIndicator size="small" color={C.white} />
                ) : (
                  <Text style={s.buttonText}>Create Account</Text>
                )}
              </TouchableOpacity>
            </View>

            <View style={s.divider}>
              <View style={s.dividerLine} />
              <Text style={s.dividerText}>Already registered?</Text>
              <View style={s.dividerLine} />
            </View>

            <View style={s.footer}>
              <Link href="/(auth)/login" asChild>
                <TouchableOpacity style={s.secondaryButton} activeOpacity={0.7}>
                  <Text style={s.secondaryButtonText}>Log in instead</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 20 },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 24,
    paddingVertical: 28,
    ...(Platform.OS === 'ios'
      ? {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
        }
      : Platform.OS === 'android'
        ? { elevation: 4 }
        : {}),
  },
  headerIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: C.sage,
    opacity: 0.2,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  header: {
    width: '100%',
    marginBottom: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
    color: C.text,
    letterSpacing: -0.3,
    fontFamily: Platform.select({ ios: undefined, android: 'sans-serif', default: undefined }),
  },
  subtitle: {
    marginTop: 6,
    color: C.muted,
    textAlign: 'center',
    fontSize: 14,
    fontFamily: Platform.select({ ios: undefined, android: 'sans-serif', default: undefined }),
  },
  form: {
    width: '100%',
    gap: 12,
  },
  inputGroup: {
    gap: 5,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: C.text,
    fontFamily: Platform.select({ ios: undefined, android: 'sans-serif', default: undefined }),
  },
  input: {
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.cardGray,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: C.text,
    fontSize: 14,
    fontFamily: Platform.select({ ios: undefined, android: 'sans-serif', default: undefined }),
  },
  genderContainer: {
    flexDirection: 'row',
    gap: 20,
  },
  genderOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: C.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: C.blue,
    borderWidth: 2,
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.blue,
  },
  genderLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: C.text,
    fontFamily: Platform.select({ ios: undefined, android: 'sans-serif', default: undefined }),
  },
  genderButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: C.text,
    fontFamily: Platform.select({ ios: undefined, android: 'sans-serif', default: undefined }),
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.cardGray,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  datePickerText: {
    fontSize: 14,
    color: C.text,
    fontFamily: Platform.select({ ios: undefined, android: 'sans-serif', default: undefined }),
  },
 
  calendarContainer: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    backgroundColor: C.cardGray,
    padding: 12,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  calendarNavButton: {
    padding: 8,
  },
  calendarTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  calendarTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: C.text,
    fontFamily: Platform.select({ ios: undefined, android: 'sans-serif', default: undefined }),
  },
  calendarYear: {
    fontSize: 16,
    fontWeight: '600',
    color: C.blue,
    fontFamily: Platform.select({ ios: undefined, android: 'sans-serif', default: undefined }),
  },
  yearSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: C.bg,
  },
  yearPickerOverlay: {
    position: 'absolute',
    top: 45,
    right: 0,
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 8,
    maxHeight: 200,
    width: 80,
    zIndex: 1000,
    ...(Platform.OS === 'ios' ? {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
    } : {
      elevation: 5,
    }),
  },
  yearPickerList: {
    maxHeight: 200,
  },
  yearOption: {
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  yearOptionSelected: {
    backgroundColor: C.blue,
  },
  yearOptionText: {
    fontSize: 13,
    fontWeight: '500',
    color: C.text,
    fontFamily: Platform.select({ ios: undefined, android: 'sans-serif', default: undefined }),
  },
  yearOptionTextSelected: {
    color: C.white,
    fontWeight: '600',
  },
  weekDaysContainer: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekDay: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
    color: C.muted,
    fontFamily: Platform.select({ ios: undefined, android: 'sans-serif', default: undefined }),
  },
  daysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  emptyDay: {
    width: '14.28%',
    aspectRatio: 1,
  },
  dayButton: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  dayButtonSelected: {
    backgroundColor: C.blue,
  },
  dayButtonDisabled: {
    opacity: 0.4,
  },
  dayText: {
    fontSize: 12,
    fontWeight: '500',
    color: C.text,
    fontFamily: Platform.select({ ios: undefined, android: 'sans-serif', default: undefined }),
  },
  dayTextSelected: {
    color: C.white,
    fontWeight: '600',
  },
  dayTextDisabled: {
    color: C.muted,
  },
  errorText: {
    color: '#E74C3C',
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '500',
    fontFamily: Platform.select({ ios: undefined, android: 'sans-serif', default: undefined }),
  },
  button: {
    backgroundColor: C.blue,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: C.white,
    fontWeight: '600',
    fontSize: 16,
    fontFamily: Platform.select({ ios: undefined, android: 'sans-serif', default: undefined }),
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: C.border,
  },
  dividerText: {
    paddingHorizontal: 12,
    color: C.muted,
    fontSize: 12,
    fontFamily: Platform.select({ ios: undefined, android: 'sans-serif', default: undefined }),
  },
  footer: {
    width: '100%',
  },
  secondaryButton: {
    borderWidth: 1.5,
    borderColor: C.blue,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: C.blue,
    fontWeight: '600',
    fontSize: 15,
    fontFamily: Platform.select({ ios: undefined, android: 'sans-serif', default: undefined }),
  },
  headerIconWrapper: {
  width: 56, height: 56, borderRadius: 28,
  alignItems: 'center', justifyContent: 'center',
  alignSelf: 'center', marginBottom: 16,
},
headerIconBg: {
  ...StyleSheet.absoluteFillObject,
  borderRadius: 28,
  backgroundColor: C.sage,
  opacity: 0.15,
},
});