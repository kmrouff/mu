import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { LoginOrb } from '../components/LoginOrb';
import { colors, type } from '../theme/tokens';

type Props = { onLogin: (name: string) => void; hasPendingInvite?: boolean };

export function LoginScreen({ onLogin, hasPendingInvite }: Props) {
  const [name, setName] = useState('');
  const trimmed = name.trim();

  return (
    <View style={styles.container}>
      <View style={styles.brandWrap}>
        <LoginOrb />
        <View style={styles.logoWrap}>
          <Text style={styles.logo}>mu</Text>
          <Text style={styles.logoSubtitle}>(miss u)</Text>
        </View>
        {hasPendingInvite && (
          <Text style={styles.inviteHint}>You've been invited — pick a name and we'll connect you</Text>
        )}
      </View>
      <View style={styles.formWrap}>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="What should we call you?"
          placeholderTextColor={colors.textSecondary2}
          autoCapitalize="words"
          autoCorrect={false}
          returnKeyType="done"
          onSubmitEditing={() => trimmed && onLogin(trimmed)}
        />
        <Pressable
          style={[styles.button, !trimmed && styles.buttonDisabled]}
          disabled={!trimmed}
          onPress={() => onLogin(trimmed)}
        >
          <Text style={styles.buttonText}>Continue</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 56,
    paddingHorizontal: 32,
  },
  brandWrap: {
    alignItems: 'center',
    gap: 18,
  },
  logoWrap: {
    alignItems: 'center',
    gap: 2,
  },
  logo: {
    fontSize: type.loginLogo,
    fontWeight: '600',
    letterSpacing: -0.88,
    color: colors.textPrimary,
  },
  logoSubtitle: {
    fontSize: 14,
    color: colors.textSecondary2,
    letterSpacing: -0.1,
  },
  inviteHint: {
    fontSize: 13,
    color: colors.textSecondary1,
    textAlign: 'center',
  },
  formWrap: {
    width: '100%',
    gap: 12,
  },
  input: {
    width: '100%',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 999,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.hairlineInput,
    fontSize: type.buttonText,
    color: colors.titleText,
    textAlign: 'center',
  },
  button: {
    width: '100%',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 999,
    backgroundColor: colors.titleText,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  buttonDisabled: {
    opacity: 0.35,
  },
  buttonText: {
    textAlign: 'center',
    fontSize: type.buttonText,
    fontWeight: '500',
    color: colors.panel,
  },
});
