import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { colors, type } from '../theme/tokens';

type Props = { onContinue: () => void };

// Shown once, right after picking a name, before the home screen ever mounts — a standalone
// screen rather than an overlay on top of the live (animating) home screen, so there's nothing
// underneath to conflict with.
export function WelcomeScreen({ onContinue }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <BlurView intensity={30} tint="light" style={StyleSheet.absoluteFill} />
        <View style={styles.cardContent}>
          <Text style={styles.paragraph}>
            We move around, live across countries and seas — and sometimes forget people are
            thinking of us.
          </Text>
          <Text style={styles.paragraph}>
            mu is a small reminder. Press someone's orb whenever you think of them, and they'll
            see it next time they open the app.
          </Text>
          <Text style={styles.paragraph}>
            Share it with your circle. No feeds, no notifications, no ads — just quiet good
            vibes.
          </Text>
        </View>
      </View>
      <Pressable style={styles.button} onPress={onContinue}>
        <Text style={styles.buttonText}>Got it</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 28,
    paddingHorizontal: 28,
    backgroundColor: colors.bg,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 32,
  },
  cardContent: {
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    paddingVertical: 32,
    paddingHorizontal: 26,
    gap: 16,
  },
  paragraph: {
    fontSize: type.body,
    lineHeight: 22,
    color: colors.titleText,
    textAlign: 'center',
  },
  button: {
    paddingVertical: 13,
    paddingHorizontal: 32,
    borderRadius: 999,
    backgroundColor: colors.titleText,
  },
  buttonText: {
    fontSize: type.buttonText,
    fontWeight: '500',
    color: colors.panel,
  },
});
