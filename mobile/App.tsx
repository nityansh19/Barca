import { useEffect, useState } from 'react';
import {
  Alert,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { demoFixtures, demoPlayers, officialLinks } from '../shared/demo';
import {
  defaultPreferences,
  parsePreferences,
  type Player,
} from '../shared/domain';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});
const tabs = ['Home', 'Matches', 'Squad', 'Updates', 'Reminders'] as const;
const key = 'barca.preferences.v1';
export default function App() {
  return (
    <SafeAreaProvider>
      <Companion />
    </SafeAreaProvider>
  );
}
function Companion() {
  const [tab, setTab] = useState<(typeof tabs)[number]>('Home');
  const [prefs, setPrefs] = useState(defaultPreferences);
  const [ready, setReady] = useState(false);
  const [player, setPlayer] = useState<Player | null>(null);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    AsyncStorage.getItem(key)
      .then((v) => setPrefs(parsePreferences(v ? JSON.parse(v) : null)))
      .catch(() => {})
      .finally(() => setReady(true));
    const id = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    if (ready)
      AsyncStorage.setItem(key, JSON.stringify(prefs)).catch(() =>
        Alert.alert('Settings', 'Could not save settings on this device.'),
      );
  }, [prefs, ready]);
  const next = demoFixtures.find(
    (f) => f.status === 'scheduled' && f.kickoff && Date.parse(f.kickoff) > now,
  );
  async function testNotification() {
    try {
      if (Platform.OS === 'android')
        await Notifications.setNotificationChannelAsync('match-reminders', {
          name: 'Match reminders',
          importance: Notifications.AndroidImportance.DEFAULT,
        });
      const permission = await Notifications.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Notifications blocked',
          'You can allow notifications in your device settings.',
        );
        return;
      }
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Barça · Test reminder',
          body: 'Your device can display reminders. Automatic match alerts are not connected yet.',
        },
        trigger: null,
      });
    } catch {
      Alert.alert(
        'Test unavailable',
        'Use a supported development build on a device and check notification permissions.',
      );
    }
  }
  return (
    <SafeAreaView style={s.safe}>
      <StatusBar style="light" />
      <View style={s.header}>
        <Text style={s.brand}>
          barça<Text style={s.gold}>.</Text>
        </Text>
        <Text style={s.meta}>FAN COMPANION</Text>
      </View>
      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.title}>{tab === 'Home' ? 'Visca el Barça.' : tab}</Text>
        <View style={s.notice}>
          <Text style={s.noticeText}>
            DEMO · Sample fixtures and stats. Availability unverified.
          </Text>
        </View>
        {tab === 'Home' && (
          <>
            <View style={s.hero}>
              <Text style={s.meta}>NEXT MATCH</Text>
              <Text style={s.heroTitle}>
                {next
                  ? 'Barcelona ' +
                    (next.home ? 'vs' : 'at') +
                    '\n' +
                    next.opponent
                  : 'Awaiting the next fixture'}
              </Text>
              <Text style={s.text}>
                {next?.kickoff
                  ? new Date(next.kickoff).toLocaleString()
                  : 'No upcoming dated demo fixture.'}
              </Text>
              <Text style={s.muted}>{next?.stadium}</Text>
              <Pressable
                style={s.primary}
                onPress={() => setTab('Reminders')}
                accessibilityRole="button"
              >
                <Text style={s.primaryText}>Set match reminders</Text>
              </Pressable>
            </View>
            <Text style={s.sectionTitle}>Squad spotlight</Text>
            {demoPlayers.slice(0, 3).map((p) => (
              <Pressable
                style={s.row}
                key={p.id}
                onPress={() => setPlayer(p)}
                accessibilityRole="button"
              >
                <Text style={s.number}>{p.number}</Text>
                <View style={s.flex}>
                  <Text style={s.name}>{p.name}</Text>
                  <Text style={s.muted}>{p.position}</Text>
                </View>
                <Text style={s.text}>View →</Text>
              </Pressable>
            ))}
          </>
        )}
        {tab === 'Matches' &&
          demoFixtures.map((f) => (
            <View style={s.card} key={f.id}>
              <Text style={s.meta}>
                {f.competition.toUpperCase()} · {f.home ? 'HOME' : 'AWAY'}
              </Text>
              <Text style={s.sectionTitle}>
                Barcelona {f.home ? 'vs' : 'at'} {f.opponent}
              </Text>
              <Text style={s.text}>
                {f.kickoff
                  ? new Date(f.kickoff).toLocaleString()
                  : 'Kickoff TBC'}
              </Text>
              <Text style={s.muted}>{f.stadium}</Text>
              {f.score && (
                <Text style={s.score}>
                  {prefs.spoilerFree ? 'Score hidden' : f.score.join(' – ')}
                </Text>
              )}
            </View>
          ))}
        {tab === 'Squad' &&
          demoPlayers.map((p) => (
            <Pressable
              style={s.row}
              key={p.id}
              onPress={() => setPlayer(p)}
              accessibilityRole="button"
            >
              <Text style={s.number}>{p.number}</Text>
              <View style={s.flex}>
                <Text style={s.name}>{p.name}</Text>
                <Text style={s.muted}>{p.position} · Availability unknown</Text>
              </View>
            </Pressable>
          ))}
        {tab === 'Updates' &&
          officialLinks.map((link) => (
            <Pressable
              style={s.card}
              key={link.url}
              accessibilityRole="link"
              onPress={() =>
                Linking.openURL(link.url).catch(() =>
                  Alert.alert('Could not open the club website'),
                )
              }
            >
              <Text style={s.meta}>{link.category} · OFFICIAL SOURCE</Text>
              <Text style={s.sectionTitle}>{link.title} ↗</Text>
              <Text style={s.muted}>{link.description}</Text>
            </Pressable>
          ))}
        {tab === 'Reminders' && (
          <View style={s.card}>
            <Text style={s.text}>
              Settings save on this device. Automatic delivery is not connected
              yet.
            </Text>
            {(
              [
                { key: 'matchDay', name: 'Match-day reminder' },
                { key: 'beforeMatch', name: 'Before kickoff' },
                { key: 'lineup', name: 'Confirmed lineup' },
                { key: 'spoilerFree', name: 'Spoiler-free mode' },
              ] as const
            ).map((item) => (
              <View key={item.key} style={s.row}>
                <Text style={[s.text, s.flex]}>{item.name}</Text>
                <Switch
                  accessibilityLabel={item.name}
                  value={prefs[item.key]}
                  onValueChange={(value) =>
                    setPrefs((p) => ({ ...p, [item.key]: value }))
                  }
                  trackColor={{ false: '#34445d', true: '#326be8' }}
                />
              </View>
            ))}
            <Text style={s.text}>Remind me before kickoff</Text>
            <View style={s.leads}>
              {([15, 30, 60] as const).map((n) => (
                <Pressable
                  key={n}
                  disabled={!prefs.beforeMatch}
                  style={[s.lead, prefs.minutesBefore === n && s.leadActive]}
                  accessibilityRole="button"
                  accessibilityState={{
                    selected: prefs.minutesBefore === n,
                    disabled: !prefs.beforeMatch,
                  }}
                  onPress={() => setPrefs((p) => ({ ...p, minutesBefore: n }))}
                >
                  <Text style={s.text}>{n} min</Text>
                </Pressable>
              ))}
            </View>
            <Pressable
              accessibilityRole="button"
              style={s.primary}
              onPress={testNotification}
            >
              <Text style={s.primaryText}>Send test notification</Text>
            </Pressable>
          </View>
        )}
        <Text style={s.footer}>
          Independent fan project. Not affiliated with FC Barcelona.
        </Text>
      </ScrollView>
      <View style={s.tabs}>
        {tabs.map((t) => (
          <Pressable
            key={t}
            style={[s.tab, tab === t && s.activeTab]}
            onPress={() => setTab(t)}
            accessibilityRole="tab"
            accessibilityState={{ selected: t === tab }}
          >
            <Text style={[s.tabText, tab === t && s.gold]}>{t}</Text>
          </Pressable>
        ))}
      </View>
      <Modal
        visible={!!player}
        animationType="slide"
        onRequestClose={() => setPlayer(null)}
      >
        <SafeAreaView style={s.safe}>
          <ScrollView contentContainerStyle={s.content}>
            <Pressable
              accessibilityRole="button"
              style={s.primary}
              onPress={() => setPlayer(null)}
            >
              <Text style={s.primaryText}>Close profile</Text>
            </Pressable>
            <Text style={s.title}>{player?.name}</Text>
            <Text style={s.text}>
              #{player?.number} · {player?.position} · {player?.nationality}
            </Text>
            <Text style={s.noticeText}>
              Availability unknown · illustrative statistics
            </Text>
            <View style={s.card}>
              <Text style={s.score}>
                {player?.goals} goals · {player?.assists} assists
              </Text>
              <Text style={s.text}>
                {player?.appearances} appearances · {player?.minutes} minutes
              </Text>
            </View>
            <Text style={s.muted}>
              Live injury, recovery and training updates will appear once the
              football feed is connected.
            </Text>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0b101a' },
  header: {
    paddingHorizontal: 22,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: { color: '#fff', fontSize: 30, fontWeight: '800' },
  gold: { color: '#f1cf75' },
  meta: { color: '#acbbd1', fontSize: 12, letterSpacing: 1.2 },
  content: { padding: 20, gap: 16 },
  title: { color: '#fff', fontSize: 34, fontWeight: '800', letterSpacing: -1 },
  notice: { padding: 13, borderRadius: 8, backgroundColor: '#2a251f' },
  noticeText: { color: '#efd7a0', fontSize: 14, lineHeight: 21 },
  hero: { backgroundColor: '#19325a', padding: 25, borderRadius: 16, gap: 15 },
  heroTitle: { color: '#fff', fontSize: 30, fontWeight: '700' },
  text: { color: '#e4eafa', fontSize: 16, lineHeight: 24 },
  muted: { color: '#a2b2cb', fontSize: 14, lineHeight: 22 },
  primary: {
    backgroundColor: '#f1cf75',
    padding: 15,
    borderRadius: 8,
    marginTop: 12,
    alignItems: 'center',
  },
  primaryText: { color: '#142039', fontWeight: '700', fontSize: 16 },
  sectionTitle: {
    color: '#fff',
    fontSize: 21,
    fontWeight: '700',
    marginVertical: 8,
  },
  card: {
    backgroundColor: '#141d2d',
    borderColor: '#2a374c',
    borderWidth: 1,
    padding: 20,
    borderRadius: 12,
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    gap: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#29354a',
  },
  number: { color: '#e9d79f', fontSize: 27, fontWeight: '800', width: 44 },
  name: { color: '#fff', fontSize: 18, fontWeight: '600' },
  flex: { flex: 1 },
  score: { color: '#fff', fontSize: 25, fontWeight: '700', marginVertical: 10 },
  tabs: {
    flexDirection: 'row',
    padding: 6,
    borderTopWidth: 1,
    borderTopColor: '#283249',
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 17, borderRadius: 6 },
  activeTab: { backgroundColor: '#1a2b48' },
  tabText: { color: '#b5c1d6', fontSize: 12 },
  footer: { color: '#879ab4', fontSize: 12, lineHeight: 20, marginTop: 18 },
  leads: { flexDirection: 'row', gap: 10 },
  lead: {
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#32435d',
  },
  leadActive: { backgroundColor: '#244477' },
});
