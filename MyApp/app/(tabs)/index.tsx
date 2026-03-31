import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { luminaPalette as palette } from '@/constants/palette';

type MetricCardProps = {
  title: string;
  value: string;
  status: string;
  statusStyle: object;
  fillStyle: object;
  token: string;
};

function MetricCard({ title, value, status, statusStyle, fillStyle, token }: MetricCardProps) {
  return (
    <View style={styles.metricCard}>
      <View style={styles.metricToken}>
        <Text style={styles.metricTokenText}>{token}</Text>
      </View>
      <Text style={styles.metricTitle}>{title}</Text>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={[styles.metricStatus, statusStyle]}>{status}</Text>
      <View style={styles.miniBar}>
        <View style={[styles.miniFill, fillStyle]} />
      </View>
    </View>
  );
}

export default function HomeScreen() {
  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Text style={styles.logo}>Lumina</Text>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>LH</Text>
            </View>
          </View>
          <Text style={styles.greetingTop}>Good morning, Layla</Text>
          <Text style={styles.greetingTitle}>Your skin is glowing today</Text>
        </View>

        <View style={styles.scoreCard}>
          <Text style={styles.scoreLabel}>Overall Skin Score</Text>
          <View style={styles.scoreRow}>
            <Text style={styles.scoreNumber}>78</Text>
            <Text style={styles.scoreTrend}>+4 pts this week</Text>
          </View>
          <View style={styles.scoreBarBg}>
            <View style={styles.scoreBarFill} />
          </View>
          <Text style={styles.scoreDesc}>Your barrier function has improved. Keep hydrating.</Text>
        </View>

        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Skin Vitals</Text>
          <Text style={styles.sectionAction}>Details</Text>
        </View>

        <View style={styles.metricsGrid}>
          <MetricCard
            title="Hydration"
            value="72%"
            status="Optimal"
            statusStyle={styles.good}
            fillStyle={styles.fillBlue}
            token="HY"
          />
          <MetricCard
            title="UV Exposure"
            value="45%"
            status="Moderate"
            statusStyle={styles.warn}
            fillStyle={styles.fillAmber}
            token="UV"
          />
          <MetricCard
            title="Sleep Quality"
            value="8.5h"
            status="Excellent"
            statusStyle={styles.info}
            fillStyle={styles.fillPurple}
            token="SL"
          />
          <MetricCard
            title="Barrier"
            value="63%"
            status="Healing"
            statusStyle={styles.good}
            fillStyle={styles.fillRose}
            token="BR"
          />
        </View>

        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Morning Routine</Text>
          <Text style={styles.sectionAction}>Edit</Text>
        </View>

        <View style={styles.routineStrip}>
          <View style={[styles.routinePill, styles.routineActive]}>
            <Text style={styles.routineStepActive}>1</Text>
            <View>
              <Text style={styles.routineStrongActive}>Cleanser</Text>
              <Text style={styles.routineLightActive}>Done</Text>
            </View>
          </View>
          <View style={styles.routinePill}>
            <Text style={styles.routineStep}>2</Text>
            <View>
              <Text style={styles.routineStrong}>Vitamin C</Text>
              <Text style={styles.routineLight}>Next step</Text>
            </View>
          </View>
          <View style={styles.routinePill}>
            <Text style={styles.routineStep}>3</Text>
            <View>
              <Text style={styles.routineStrong}>Moisturiser</Text>
              <Text style={styles.routineLight}>Pending</Text>
            </View>
          </View>
        </View>

        <View style={styles.insight}>
          <View style={styles.insightBadge}>
            <Text style={styles.insightBadgeText}>IN</Text>
          </View>
          <View style={styles.insightBody}>
            <Text style={styles.insightLabel}>Weekly Insight</Text>
            <Text style={styles.insightTitle}>Add a ceramide serum tonight</Text>
            <Text style={styles.insightText}>
              Your barrier is recovering from last week&apos;s dryness. A ceramide boost at night
              will help accelerate repair.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: palette.cream,
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 28,
    gap: 16,
  },
  header: {
    backgroundColor: palette.ivory,
    borderRadius: 28,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  logo: {
    fontSize: 28,
    fontWeight: '400',
    color: palette.text,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: palette.petal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: palette.deepRose,
    fontWeight: '700',
    fontSize: 12,
  },
  greetingTop: {
    color: palette.textMuted,
    fontSize: 13,
    marginBottom: 2,
  },
  greetingTitle: {
    color: palette.text,
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '500',
  },
  scoreCard: {
    backgroundColor: palette.deepRose,
    borderRadius: 24,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 14,
    elevation: 6,
  },
  scoreLabel: {
    color: palette.white,
    opacity: 0.8,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontSize: 12,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 14,
  },
  scoreNumber: {
    color: palette.white,
    fontSize: 62,
    lineHeight: 62,
    fontWeight: '300',
  },
  scoreTrend: {
    color: palette.white,
    fontSize: 13,
    marginBottom: 8,
    opacity: 0.95,
  },
  scoreBarBg: {
    height: 6,
    borderRadius: 99,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  scoreBarFill: {
    width: '78%',
    height: '100%',
    backgroundColor: palette.white,
  },
  scoreDesc: {
    color: palette.white,
    opacity: 0.8,
    marginTop: 8,
    fontSize: 12,
  },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 22,
    color: palette.text,
    fontWeight: '500',
  },
  sectionAction: {
    color: palette.deepRose,
    fontSize: 12,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricCard: {
    width: '48%',
    backgroundColor: palette.white,
    borderRadius: 20,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  metricToken: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: palette.sand,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  metricTokenText: {
    color: palette.deepRose,
    fontSize: 11,
    fontWeight: '700',
  },
  metricTitle: {
    color: palette.textMuted,
    textTransform: 'uppercase',
    fontSize: 10,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  metricValue: {
    color: palette.text,
    fontSize: 28,
    fontWeight: '500',
  },
  metricStatus: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: '600',
  },
  good: { color: '#5BAB7E' },
  warn: { color: '#D4922B' },
  info: { color: '#7B6FD4' },
  miniBar: {
    marginTop: 10,
    height: 4,
    borderRadius: 99,
    overflow: 'hidden',
    backgroundColor: palette.sand,
  },
  miniFill: { height: '100%' },
  fillBlue: { width: '72%', backgroundColor: '#6EC3E0' },
  fillAmber: { width: '45%', backgroundColor: '#F0B040' },
  fillPurple: { width: '85%', backgroundColor: '#A89CE0' },
  fillRose: { width: '63%', backgroundColor: palette.rose },
  routineStrip: {
    flexDirection: 'row',
    gap: 10,
    paddingBottom: 4,
  },
  routinePill: {
    backgroundColor: palette.white,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  routineActive: {
    backgroundColor: palette.rose,
  },
  routineStep: {
    width: 26,
    height: 26,
    borderRadius: 13,
    textAlign: 'center',
    lineHeight: 26,
    color: palette.textMuted,
    backgroundColor: palette.sand,
    fontSize: 12,
    fontWeight: '600',
  },
  routineStepActive: {
    width: 26,
    height: 26,
    borderRadius: 13,
    textAlign: 'center',
    lineHeight: 26,
    color: palette.white,
    backgroundColor: 'rgba(255,255,255,0.25)',
    fontSize: 12,
    fontWeight: '600',
  },
  routineStrong: {
    color: palette.text,
    fontSize: 13,
    fontWeight: '600',
  },
  routineLight: {
    color: palette.textMuted,
    fontSize: 11,
  },
  routineStrongActive: {
    color: palette.white,
    fontSize: 13,
    fontWeight: '600',
  },
  routineLightActive: {
    color: palette.white,
    fontSize: 11,
    opacity: 0.9,
  },
  insight: {
    backgroundColor: palette.blush,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(232,144,154,0.25)',
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  insightBadge: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: palette.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: palette.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
  },
  insightBadgeText: {
    color: palette.deepRose,
    fontWeight: '700',
    fontSize: 12,
  },
  insightBody: {
    flex: 1,
  },
  insightLabel: {
    color: palette.deepRose,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontSize: 10,
    marginBottom: 3,
  },
  insightTitle: {
    color: palette.text,
    fontSize: 19,
    fontWeight: '500',
    marginBottom: 4,
  },
  insightText: {
    color: palette.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
});
