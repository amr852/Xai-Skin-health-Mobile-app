import React, { ReactNode } from 'react';
import { View, ScrollView, StatusBar, StyleSheet, ScrollViewProps, RefreshControlProps } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { C } from '@/constants/theme';

interface Props {
  /** ScreenHeader instance, or false to omit. */
  header?: ReactNode;
  /** Bottom tab bar instance, or false to omit. */
  tabBar?: ReactNode;
  /** Body content. If `scroll` is true, wraps in a ScrollView. */
  children: ReactNode;
  /** Wrap body in a ScrollView. Default true. */
  scroll?: boolean;
  /** Background color override. */
  background?: string;
  /** StatusBar bar style. Default 'dark'. */
  statusBarStyle?: 'dark-content' | 'light-content';
  /** Pull-to-refresh control passed through to inner ScrollView. */
  refreshControl?: React.ReactElement<RefreshControlProps>;
  /** Extra ScrollView props (contentContainerStyle, etc.). */
  scrollProps?: Partial<ScrollViewProps>;
  /** Edges to apply SafeArea on. Default ['top','left','right']. */
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
}

const TAB_RESERVE = 92; // tab-bar height + spacing

/**
 * Single screen primitive — replaces the per-screen SafeArea/StatusBar/
 * ScrollView/BottomTabBar boilerplate that drifted between screens.
 */
export function Screen({
  header,
  tabBar,
  children,
  scroll = true,
  background = C.bg,
  statusBarStyle = 'dark-content',
  refreshControl,
  scrollProps,
  edges = ['top', 'left', 'right'],
}: Props) {
  const insets = useSafeAreaInsets();
  const reserveBottom = tabBar ? TAB_RESERVE + insets.bottom : 0;

  // Spread scrollProps FIRST, then explicitly override contentContainerStyle as
  // an array so caller-provided styles compose with our reserve, never replace it.
  const { contentContainerStyle: callerCCS, ...restScrollProps } = scrollProps ?? {};
  const body = scroll ? (
    <ScrollView
      style={s.flex}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      refreshControl={refreshControl}
      {...restScrollProps}
      contentContainerStyle={[
        { paddingBottom: reserveBottom },
        callerCCS,
      ]}>
      {children}
    </ScrollView>
  ) : (
    <View style={[s.flex, { paddingBottom: reserveBottom }]}>{children}</View>
  );

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: background }]} edges={edges}>
      <StatusBar barStyle={statusBarStyle} backgroundColor={background} />
      {header}
      {body}
      {tabBar}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
});
