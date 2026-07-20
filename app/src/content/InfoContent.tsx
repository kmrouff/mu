import React from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, type } from '../theme/tokens';

const FEEDBACK_SLACK_URL = 'https://join.slack.com/t/mu-jwf5271/shared_invite/zt-44julrws0-h2gHgmoBFvTdr4pOX6bTuQ';

export function MissionContent() {
  return (
    <View>
      <Text style={styles.paragraph}>
        mu isn't trying to be another feed. No metrics, no streaks, no algorithm deciding what
        matters.
      </Text>
      <Text style={styles.paragraph}>
        Just a small, quiet way to say: I was thinking of you. Nothing to post, nothing to
        maintain, nothing keeping score.
      </Text>
      <Text style={styles.paragraph}>
        One honest nudge is enough to feel a little less alone. That's the whole idea.
      </Text>
    </View>
  );
}

const FAQ_ITEMS: { q: string; a: string }[] = [
  {
    q: 'How does it work?',
    a: 'Pick someone. Press the orb. They feel a little glow show up on their end. That’s the whole interaction — no typing, no notifications trying to win you back.',
  },
  {
    q: 'What do the orbs mean?',
    a: 'Blue is quiet. Yellow is you, reaching out. Green is them, thinking of you. Press at the same time and it turns red with a little heartbeat — the good kind of coincidence.',
  },
  {
    q: 'What do you do with my data?',
    a: 'Not much, on purpose. We don’t sell it, study it, or feed it to an algorithm. It exists just long enough to tell your person you were thinking of them.',
  },
  {
    q: 'Okay, but really — nothing else?',
    a: 'Nothing else. No ads, no analytics dashboard, no growth team. Just quiet, then a small glow, then quiet again.',
  },
  {
    q: 'Is this powered by AI?',
    a: 'Nope. It’s powered by you pressing a button, and someone else being glad you did.',
  },
  {
    q: 'Why is it called "mu"?',
    a: 'μ is small, quiet, and doesn’t try to explain itself too much. Felt right. Oh, and it stands for "miss u".',
  },
];

export function FaqContent() {
  return (
    <View>
      {FAQ_ITEMS.map((item, i) => (
        <View key={item.q} style={[styles.faqItem, i === 0 && { marginTop: 0 }]}>
          <Text style={styles.faqQ}>{item.q}</Text>
          <Text style={styles.faqA}>{item.a}</Text>
        </View>
      ))}
    </View>
  );
}

const TERMS_ITEMS = [
  'Be a decent person. Don’t use mu to harass, spam, or impersonate anyone.',
  'We don’t sell your data. There isn’t much of it, and selling it was never the plan.',
  'mu is provided as-is, built in spare time — no guarantees it’s always perfect or always up.',
  'If mu ever grows real accounts and syncing, your info is only ever used to make the app work.',
  'This page might change as the app grows. We’ll try to keep it honest and just as short.',
];

export function TermsContent() {
  return (
    <View>
      <Text style={styles.paragraph}>
        This is a small independent project, not a company — so these are simple, not
        corporate.
      </Text>
      {TERMS_ITEMS.map((item) => (
        <View key={item} style={styles.bulletRow}>
          <Text style={styles.bulletDot}>{'•'}</Text>
          <Text style={styles.bulletText}>{item}</Text>
        </View>
      ))}
      <Text style={[styles.paragraph, { marginTop: 20 }]}>
        That's genuinely it. No legal team was involved in writing this (there isn't one).
      </Text>
    </View>
  );
}

export function ContactContent() {
  return (
    <View>
      <Text style={styles.paragraph}>
        mu is made by one person, not a company. If something's broken, weird, or you just want
        to say hi — there's a small Slack channel for that.
      </Text>
      <Pressable style={styles.contactBtn} onPress={() => Linking.openURL(FEEDBACK_SLACK_URL)}>
        <Text style={styles.contactBtnText}>Join the feedback channel</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  paragraph: {
    fontSize: type.body,
    lineHeight: 22,
    color: colors.textPrimary,
    marginBottom: 16,
  },
  faqItem: {
    marginTop: 22,
  },
  faqQ: {
    fontSize: type.body,
    fontWeight: '600',
    color: colors.titleText,
    marginBottom: 6,
  },
  faqA: {
    fontSize: type.body,
    lineHeight: 21,
    color: colors.textSecondary1,
  },
  bulletRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  bulletDot: {
    fontSize: type.body,
    color: colors.textSecondary1,
  },
  bulletText: {
    flex: 1,
    fontSize: type.body,
    lineHeight: 21,
    color: colors.textPrimary,
  },
  contactBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 13,
    paddingHorizontal: 22,
    borderRadius: 999,
    backgroundColor: colors.panel,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  contactBtnText: {
    fontSize: type.buttonText,
    fontWeight: '500',
    color: colors.titleText,
  },
});
