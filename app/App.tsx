import React, { useEffect } from 'react';
import { Platform, StyleSheet, View, type ViewStyle } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { LoginScreen } from './src/screens/LoginScreen';
import { WelcomeScreen } from './src/screens/WelcomeScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { useMuState } from './src/state/useMuState';
import { colors, motion } from './src/theme/tokens';

type Screen = 'login' | 'welcome' | 'home';

export default function App() {
  const state = useMuState();
  const loginOpacity = useSharedValue(1);
  const welcomeOpacity = useSharedValue(0);
  const homeOpacity = useSharedValue(0);
  const shakeX = useSharedValue(0);

  const screen: Screen = !state.loggedIn ? 'login' : state.showWelcome ? 'welcome' : 'home';

  useEffect(() => {
    const duration = motion.crossFadeMs;
    const easing = Easing.inOut(Easing.ease);
    loginOpacity.value = withTiming(screen === 'login' ? 1 : 0, { duration, easing });
    welcomeOpacity.value = withTiming(screen === 'welcome' ? 1 : 0, { duration, easing });
    homeOpacity.value = withTiming(screen === 'home' ? 1 : 0, { duration, easing });
  }, [screen]);

  // README "both" state: whole screen shakes very subtly for as long as the mutual state holds.
  useEffect(() => {
    if (state.both) {
      shakeX.value = withRepeat(
        withSequence(
          withTiming(0, { duration: 0 }),
          withTiming(-0.55, { duration: 105 }),
          withTiming(0.45, { duration: 105 }),
          withTiming(-0.35, { duration: 105 }),
          withTiming(0.35, { duration: 105 }),
          withTiming(0, { duration: 525 }),
        ),
        -1,
      );
    } else {
      shakeX.value = withTiming(0, { duration: 150 });
    }
  }, [state.both]);

  const loginLayerStyle = useAnimatedStyle(() => ({ opacity: loginOpacity.value }));
  const welcomeLayerStyle = useAnimatedStyle(() => ({ opacity: welcomeOpacity.value }));
  const homeLayerStyle = useAnimatedStyle(() => ({ opacity: homeOpacity.value }));
  const shellStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: shakeX.value }],
  }));

  return (
    <SafeAreaProvider>
      <View style={styles.root}>
        <Animated.View style={[StyleSheet.absoluteFill, shellStyle]}>
          <Animated.View
            style={[StyleSheet.absoluteFill, loginLayerStyle]}
            pointerEvents={screen === 'login' ? 'auto' : 'none'}
          >
            <LoginScreen onLogin={state.setName} hasPendingInvite={state.hasPendingInvite} />
          </Animated.View>

          <Animated.View
            style={[StyleSheet.absoluteFill, welcomeLayerStyle]}
            pointerEvents={screen === 'welcome' ? 'auto' : 'none'}
          >
            <WelcomeScreen onContinue={state.dismissWelcome} />
          </Animated.View>

          <Animated.View
            style={[StyleSheet.absoluteFill, homeLayerStyle]}
            pointerEvents={screen === 'home' ? 'auto' : 'none'}
          >
            <HomeScreen
              contacts={state.contacts}
              selectedId={state.selectedId}
              youPressing={state.youPressing}
              theirActive={state.theirActive}
              unseen={state.unseen}
              lastPingAt={state.lastPingAt}
              both={state.both}
              settingsOpen={state.settingsOpen}
              showAddOverlay={state.showAddOverlay}
              infoScreen={state.infoScreen}
              onSelect={state.selectContact}
              onPressIn={state.handlePress}
              onPressOut={state.handleRelease}
              onToggleSettings={state.toggleSettings}
              onCloseSettings={state.closeSettings}
              onOpenAdd={state.openAddOverlay}
              onCloseAdd={state.closeAddOverlay}
              onOpenInfo={state.openInfo}
              onCloseInfo={state.closeInfo}
              onLogout={state.logout}
              onCreateCode={state.createShareCode}
              onRedeemCode={state.redeemCode}
            />
          </Animated.View>
        </Animated.View>
        <StatusBar style="dark" />
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
    // `hidden` still lets the browser treat this as a real scroll container — e.g. focusing an
    // input elsewhere in the app can silently scroll it via the native "scroll into view" behavior,
    // and since all three screens (login/welcome/home) live inside this one div, that offset then
    // persists across screens, permanently hiding content above it. `clip` (web-only; RN's own type
    // doesn't know it, hence the cast) still clips the closed AddOverlay/SettingsDrawer's
    // off-screen content but never lets this box become scrollable in the first place.
    overflow: Platform.OS === 'web' ? ('clip' as ViewStyle['overflow']) : 'hidden',
  },
});
