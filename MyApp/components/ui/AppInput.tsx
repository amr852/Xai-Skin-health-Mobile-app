import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  TextInputProps,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { C } from '@/constants/theme';

interface Props extends TextInputProps {
  label: string;
  required?: boolean;
  optional?: boolean;
  multiline?: boolean;
  error?: string;
  secureEntry?: boolean;
}

export function AppInput({
  label, required, optional, multiline, error, secureEntry, style, ...rest
}: Props) {
  const [focused, setFocused] = useState(false);
  const [hidden,  setHidden]  = useState(secureEntry ?? false);

  return (
    <View style={s.group}>
      <Text style={s.label}>
        {label}
        {required && <Text style={s.req}> *</Text>}
        {optional && <Text style={s.opt}> (optional)</Text>}
      </Text>
      <View style={[
        s.inputWrap,
        focused  && s.inputFocused,
        !!error  && s.inputError,
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
          <TouchableOpacity onPress={() => setHidden(v => !v)} style={s.eye} hitSlop={8}>
            <Feather name={hidden ? 'eye' : 'eye-off'} size={18} color={C.textHint} />
          </TouchableOpacity>
        )}
      </View>
      {error ? <Text style={s.errTxt}>{error}</Text> : null}
    </View>
  );
}

const s = StyleSheet.create({
  group:  { marginBottom: 16 },
  label:  { fontSize: 13, fontWeight: '600', color: C.text, marginBottom: 7 },
  req:    { color: C.urgentText },
  opt:    { color: C.textHint, fontWeight: '400' },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.surface,
    borderWidth: 1.5, borderColor: C.border,
    borderRadius: 12,
    overflow: 'hidden',
  },
  inputFocused: { borderColor: C.primary },
  inputError:   { borderColor: C.urgentText },
  input: {
    flex: 1, height: 50,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: C.text,
  },
  inputMulti: { height: 96, paddingTop: 12 },
  eye: { paddingHorizontal: 12 },
  errTxt: { fontSize: 12, color: C.urgentText, marginTop: 5 },
});
