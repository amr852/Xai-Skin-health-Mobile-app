import { useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, TextInputProps,
} from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { C, FontFamily } from '@/constants/theme';

interface Props extends TextInputProps {
  label: string;
  required?: boolean;
  optional?: boolean;
  multiline?: boolean;
  error?: string;
  secureEntry?: boolean;
  hint?: string;
}

/**
 * Outlined input — clinical, neutral, no decorative focus accent. The focus
 * state is the border color change to primary.
 */
export function AppInput({
  label, required, optional, multiline, error, secureEntry, hint, style, ...rest
}: Props) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden]   = useState(secureEntry ?? false);

  return (
    <View style={s.group}>
      <View style={s.labelRow}>
        <Text style={s.label}>
          {label}
          {required && <Text style={s.req}> *</Text>}
          {optional && <Text style={s.opt}>  Optional</Text>}
        </Text>
      </View>
      <View
        style={[
          s.inputWrap,
          focused && s.inputFocused,
          !!error && s.inputError,
        ]}>
        <TextInput
          style={[s.input, multiline && s.inputMulti, style]}
          placeholderTextColor={C.textHint}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          multiline={multiline}
          numberOfLines={multiline ? 3 : 1}
          textAlignVertical={multiline ? 'top' : 'center'}
          secureTextEntry={hidden}
          {...rest}
        />
        {secureEntry && (
          <Pressable onPress={() => setHidden(v => !v)} style={s.eye} hitSlop={8}>
            {hidden ? (
              <Eye size={18} color={C.textSub} strokeWidth={1.6} />
            ) : (
              <EyeOff size={18} color={C.textSub} strokeWidth={1.6} />
            )}
          </Pressable>
        )}
      </View>
      {error ? <Text style={s.errTxt}>{error}</Text> : hint ? <Text style={s.hintTxt}>{hint}</Text> : null}
    </View>
  );
}

const s = StyleSheet.create({
  group:  { marginBottom: 16 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 },
  label:  {
    fontSize: 13,
    fontFamily: FontFamily.bodySemibold,
    color: C.text,
    letterSpacing: 0.05,
  },
  req: { color: C.urgentText },
  opt: {
    color: C.textHint,
    fontFamily: FontFamily.body,
    fontSize: 11,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.surface,
    borderWidth: 1.25, borderColor: C.border,
    borderRadius: 12,
    overflow: 'hidden',
  },
  inputFocused: { borderColor: C.primary, backgroundColor: '#FFFCFD' },
  inputError:   { borderColor: C.urgentText },
  input: {
    flex: 1, height: 48,
    paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 15,
    fontFamily: FontFamily.body,
    color: C.text,
  },
  inputMulti: { height: 100, paddingTop: 12 },
  eye: { paddingHorizontal: 14 },
  errTxt: {
    fontSize: 12,
    fontFamily: FontFamily.bodyMedium,
    color: C.urgentText,
    marginTop: 5,
    marginLeft: 2,
  },
  hintTxt: {
    fontSize: 12,
    fontFamily: FontFamily.body,
    color: C.textHint,
    marginTop: 5,
    marginLeft: 2,
  },
});
