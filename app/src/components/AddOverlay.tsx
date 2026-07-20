import React, { useEffect, useState } from 'react';
import { Keyboard, Linking as RNLinking, Platform, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Linking from 'expo-linking';
import { BlurView } from 'expo-blur';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { colors, motion, orbTheme, type } from '../theme/tokens';
import { RedeemCodeResult, RemoteContact } from '../firebase/pairing';
import { buildInviteMessage, looksLikeEmail, looksLikeValidCode, looksLikeValidTarget } from '../content/inviteMessage';

type Props = {
  open: boolean;
  onClose: () => void;
  onCreateCode: () => Promise<string>;
  onRedeemCode: (code: string) => Promise<RedeemCodeResult>;
};

const ERROR_MESSAGES: Record<Exclude<RedeemCodeResult, { contact: RemoteContact }>['error'], string> = {
  not_found: "That code doesn't match anyone — check it and try again.",
  expired: 'That code expired. Ask them to share a fresh one.',
  self: "That's your own code — get someone else to enter it instead.",
};

export function AddOverlay({ open, onClose, onCreateCode, onRedeemCode }: Props) {
  const progress = useSharedValue(0);

  const [redeemInput, setRedeemInput] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'error' | 'success'>('idle');
  const [message, setMessage] = useState('');

  const [inviteTarget, setInviteTarget] = useState('');
  const [inviteSending, setInviteSending] = useState(false);
  const [inviteFeedback, setInviteFeedback] = useState('');

  const [shareCode, setShareCode] = useState<string | null>(null);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [creatingCode, setCreatingCode] = useState(false);

  useEffect(() => {
    progress.value = withTiming(open ? 1 : 0, {
      duration: open ? motion.sheetMs : 300,
      easing: Easing.bezier(0.32, 0.72, 0, 1),
    });
    if (!open) {
      // Without this, a keyboard left open from the search input stays up after the sheet
      // closes, squeezing the whole app into the top portion of the screen.
      Keyboard.dismiss();
      setRedeemInput('');
      setStatus('idle');
      setMessage('');
      setInviteTarget('');
      setInviteFeedback('');
      setShareCode(null);
      setShareLink(null);
    }
  }, [open]);

  const sheetStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * 400 }],
  }));

  // All three invite actions (direct invite, share-with-message, share-code-only) send the
  // same code+link — generate it once per visit and reuse it rather than minting a fresh one
  // per tap. `Linking.createURL` builds the right link for wherever this is actually running:
  // an exp://<dev-server-host>/--/connect/<code> link in Expo Go dev mode (works for anyone on
  // the same network — or anywhere, once shared via an EAS-hosted link instead of the local
  // dev server), or a mu://connect/<code> link in a real standalone/dev-client build.
  async function getOrCreateInvite(): Promise<{ code: string; link: string }> {
    if (shareCode && shareLink) return { code: shareCode, link: shareLink };
    setCreatingCode(true);
    try {
      const code = await onCreateCode();
      const link = Linking.createURL(`connect/${code}`);
      setShareCode(code);
      setShareLink(link);
      return { code, link };
    } finally {
      setCreatingCode(false);
    }
  }

  async function handleRedeem() {
    if (!redeemInput.trim()) return;
    setStatus('loading');
    try {
      const result = await onRedeemCode(redeemInput);
      if ('error' in result) {
        setStatus('error');
        setMessage(ERROR_MESSAGES[result.error]);
      } else {
        setStatus('success');
        setMessage(`Connected with ${result.contact.name}!`);
        setTimeout(onClose, 900);
      }
    } catch {
      setStatus('error');
      setMessage("Couldn't reach the server — check your connection and try again.");
    }
  }

  async function handleSendInvite() {
    const target = inviteTarget.trim();
    if (!target) return;
    setInviteSending(true);
    setInviteFeedback('');
    try {
      const { code, link } = await getOrCreateInvite();
      const body = buildInviteMessage(code, link);
      if (looksLikeEmail(target)) {
        await RNLinking.openURL(
          `mailto:${target}?subject=${encodeURIComponent('A little nudge from mu')}&body=${encodeURIComponent(body)}`,
        );
      } else {
        const separator = Platform.OS === 'ios' ? '&' : '?';
        await RNLinking.openURL(`sms:${target}${separator}body=${encodeURIComponent(body)}`);
      }
    } catch {
      setInviteFeedback("Couldn't open that — check the email or number and try again.");
    } finally {
      setInviteSending(false);
    }
  }

  async function handleShareWithMessage() {
    try {
      const { code, link } = await getOrCreateInvite();
      await Share.share({ message: buildInviteMessage(code, link) });
    } catch {
      // user cancelled the share sheet, or code creation failed — nothing to show, not an error
    }
  }

  async function handleShareCodeOnly() {
    try {
      const { code } = await getOrCreateInvite();
      await Share.share({ message: code });
    } catch {
      // same as above
    }
  }

  const isCodeValid = looksLikeValidCode(redeemInput);
  const isTargetValid = looksLikeValidTarget(inviteTarget);

  return (
    <Animated.View style={[styles.container, sheetStyle]} pointerEvents={open ? 'auto' : 'none'}>
      <BlurView intensity={30} tint="light" style={StyleSheet.absoluteFill} />
      <View style={styles.content}>
        <View style={styles.header}>
          <Pressable style={styles.closeBtn} onPress={onClose}>
            <View style={[styles.xLine, { transform: [{ rotate: '45deg' }] }]} />
            <View style={[styles.xLine, { transform: [{ rotate: '-45deg' }] }]} />
          </Pressable>
          <Text style={styles.title}>Connect with someone</Text>
          <Pressable
            style={[styles.submitBtn, isCodeValid ? styles.submitBtnActive : styles.submitBtnInactive]}
            onPress={handleRedeem}
            disabled={!isCodeValid}
          >
            <View style={[styles.check, !isCodeValid && styles.checkInactive]} />
          </Pressable>
        </View>

        <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <TextInput
            style={styles.input}
            placeholder="Have a code? Enter it here"
            placeholderTextColor={colors.textSecondary2}
            autoCapitalize="characters"
            autoCorrect={false}
            value={redeemInput}
            onChangeText={(t) => {
              setRedeemInput(t);
              setStatus('idle');
            }}
            onSubmitEditing={handleRedeem}
          />
          {status !== 'idle' && status !== 'loading' && (
            <Text style={status === 'error' ? styles.errorText : styles.successText}>{message}</Text>
          )}

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or invite someone</Text>
            <View style={styles.dividerLine} />
          </View>

          <TextInput
            style={styles.input}
            placeholder="Their email or phone"
            placeholderTextColor={colors.textSecondary2}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            value={inviteTarget}
            onChangeText={(t) => {
              setInviteTarget(t);
              setInviteFeedback('');
            }}
            onSubmitEditing={handleSendInvite}
          />
          {!!inviteFeedback && <Text style={styles.errorText}>{inviteFeedback}</Text>}
          <Pressable
            style={[styles.sendBtn, (!isTargetValid || inviteSending) && styles.sendBtnDisabled]}
            onPress={handleSendInvite}
            disabled={!isTargetValid || inviteSending}
          >
            <Text style={styles.sendBtnText}>Send invite</Text>
          </Pressable>

          <Pressable style={styles.shareBtn} onPress={handleShareWithMessage} disabled={creatingCode}>
            <Text style={styles.shareBtnText}>
              {shareCode ? `Share invite — code ${shareCode}` : 'Share invite'}
            </Text>
          </Pressable>
          <Pressable style={styles.codeOnlyBtn} onPress={handleShareCodeOnly} disabled={creatingCode}>
            <Text style={styles.codeOnlyBtnText}>Just share the code, no message</Text>
          </Pressable>
        </ScrollView>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 40,
    backgroundColor: colors.addOverlayBg,
  },
  content: {
    flex: 1,
    paddingTop: 70,
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  xLine: {
    position: 'absolute',
    width: 15,
    height: 1.6,
    borderRadius: 1,
    backgroundColor: colors.xLine,
  },
  title: {
    flex: 1,
    fontSize: type.sheetTitle,
    fontWeight: '600',
    color: colors.titleText,
    textAlign: 'center',
  },
  submitBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnActive: {
    backgroundColor: orbTheme.receiving.mid,
    shadowColor: orbTheme.receiving.glow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 14,
  },
  submitBtnInactive: {
    backgroundColor: colors.addTileLo,
  },
  check: {
    width: 12,
    height: 6,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderColor: '#fff',
    transform: [{ rotate: '-45deg' }, { translateX: 1 }, { translateY: -1 }],
  },
  checkInactive: {
    borderColor: colors.textSecondary2,
  },
  body: {
    flex: 1,
    marginTop: 32,
  },
  bodyContent: {
    gap: 14,
    paddingBottom: 48,
  },
  input: {
    width: '100%',
    paddingVertical: 15,
    paddingHorizontal: 18,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.hairlineInput,
    backgroundColor: colors.searchInputBg,
    fontSize: type.body,
    color: colors.titleText,
  },
  errorText: {
    fontSize: 13,
    color: colors.logout,
    paddingHorizontal: 4,
  },
  successText: {
    fontSize: 13,
    color: colors.textPrimary,
    paddingHorizontal: 4,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 6,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.hairlineInput,
  },
  dividerText: {
    fontSize: type.divider,
    color: colors.dividerText,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  sendBtn: {
    paddingVertical: 15,
    paddingHorizontal: 18,
    borderRadius: 18,
    backgroundColor: colors.titleText,
  },
  sendBtnDisabled: {
    opacity: 0.35,
  },
  sendBtnText: {
    textAlign: 'center',
    fontSize: type.body,
    fontWeight: '500',
    color: colors.panel,
  },
  shareBtn: {
    paddingVertical: 15,
    paddingHorizontal: 18,
    borderRadius: 18,
    backgroundColor: colors.shareBg,
    borderWidth: 1,
    borderColor: colors.hairlineStrong,
  },
  shareBtnText: {
    textAlign: 'center',
    fontSize: type.body,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  codeOnlyBtn: {
    paddingVertical: 8,
  },
  codeOnlyBtnText: {
    textAlign: 'center',
    fontSize: 13,
    color: colors.textSecondary2,
    textDecorationLine: 'underline',
  },
});
