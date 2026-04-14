// components/ui/AppAlert.tsx
import React, { useState } from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet, Platform,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { C } from '@/constants/theme';

type FeatherIconName = React.ComponentProps<typeof Feather>['name'];

export type AlertVariant = 'info' | 'success' | 'warning' | 'error' | 'confirm';

export interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

export interface AlertConfig {
  title: string;
  message?: string;
  variant?: AlertVariant;
  buttons?: AlertButton[];
}

const VARIANT_META: Record<AlertVariant, {
  icon: FeatherIconName;
  iconColor: string;
  iconBg: string;
  borderColor: string;
}> = {
  info: {
    icon: 'info',
    iconColor: C.primary,
    iconBg: C.primaryLight,
    borderColor: C.border,
  },
  success: {
    icon: 'check-circle',
    iconColor: C.stableText,
    iconBg: C.stableBg,
    borderColor: C.stableBorder,
  },
  warning: {
    icon: 'alert-triangle',
    iconColor: C.warnText,
    iconBg: C.warnBg,
    borderColor: C.warnBorder,
  },
  error: {
    icon: 'alert-circle',
    iconColor: C.urgentText,
    iconBg: C.urgentBg,
    borderColor: C.urgentBorder,
  },
  confirm: {
    icon: 'trash-2',
    iconColor: C.urgentText,
    iconBg: C.urgentBg,
    borderColor: C.urgentBorder,
  },
};

// ── The alert modal component ─────────────────────────────────────────────────
interface AppAlertProps {
  config: AlertConfig | null;
  onDismiss: () => void;
}

export function AppAlert({ config, onDismiss }: AppAlertProps) {
  if (!config) return null;

  const variant = config.variant ?? 'info';
  const meta = VARIANT_META[variant];
  const buttons: AlertButton[] = config.buttons ?? [{ text: 'OK', style: 'default' }];

  const handleButton = (btn: AlertButton) => {
    onDismiss();
    btn.onPress?.();
  };

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onDismiss}>
      <View style={st.backdrop}>
        <View style={[st.card, { borderTopColor: meta.borderColor }]}>

          {/* Icon circle */}
          <View style={[st.iconCircle, { backgroundColor: meta.iconBg, borderColor: meta.borderColor }]}>
            <Feather name={meta.icon} size={26} color={meta.iconColor} />
          </View>

          {/* Title */}
          <Text style={st.title}>{config.title}</Text>

          {/* Message */}
          {config.message ? (
            <Text style={st.message}>{config.message}</Text>
          ) : null}

          {/* Buttons */}
          <View style={[st.btnRow, buttons.length === 1 && st.btnRowSingle]}>
            {buttons.map((btn, i) => {
              const isDestructive = btn.style === 'destructive';
              const isCancel = btn.style === 'cancel';
              return (
                <TouchableOpacity
                  key={i}
                  style={[
                    st.btn,
                    buttons.length === 1 && st.btnFull,
                    isDestructive && st.btnDestructive,
                    isCancel      && st.btnCancel,
                    !isDestructive && !isCancel && st.btnDefault,
                  ]}
                  onPress={() => handleButton(btn)}
                  activeOpacity={0.75}>
                  <Text style={[
                    st.btnTxt,
                    isDestructive && st.btnTxtDestructive,
                    isCancel      && st.btnTxtCancel,
                    !isDestructive && !isCancel && st.btnTxtDefault,
                  ]}>
                    {btn.text}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── Hook for convenient usage ─────────────────────────────────────────────────
export function useAppAlert() {
  const [config, setConfig] = useState<AlertConfig | null>(null);

  const showAlert = (cfg: AlertConfig) => setConfig(cfg);
  const hideAlert = () => setConfig(null);

  const alertNode = <AppAlert config={config} onDismiss={hideAlert} />;

  return { showAlert, alertNode };
}

// ── Styles ────────────────────────────────────────────────────────────────────
const st = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  card: {
    width: '100%',
    backgroundColor: C.surface,
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 20,
    alignItems: 'center',
    borderTopWidth: 3,
    ...(Platform.OS === 'ios'
      ? { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 24 }
      : Platform.OS === 'android' ? { elevation: 12 } : {}),
  },

  iconCircle: {
    width: 64, height: 64, borderRadius: 32,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5,
    marginBottom: 16,
  },

  title: {
    fontSize: 18, fontWeight: '800', color: C.text,
    textAlign: 'center', letterSpacing: -0.3, marginBottom: 8,
  },
  message: {
    fontSize: 14, color: C.textSub, textAlign: 'center',
    lineHeight: 21, marginBottom: 4,
  },

  btnRow: {
    flexDirection: 'row', gap: 10, marginTop: 20, width: '100%',
  },
  btnRowSingle: {
    flexDirection: 'column',
  },
  btn: {
    flex: 1, height: 46, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5,
  },
  btnFull: { flex: 0, width: '100%' },
  btnDefault: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  btnDestructive: {
    backgroundColor: C.urgentBg,
    borderColor: C.urgentBorder,
  },
  btnCancel: {
    backgroundColor: C.surface,
    borderColor: C.border,
  },
  btnTxt: { fontSize: 15, fontWeight: '700' },
  btnTxtDefault:     { color: '#fff' },
  btnTxtDestructive: { color: C.urgentText },
  btnTxtCancel:      { color: C.textSub },
});
