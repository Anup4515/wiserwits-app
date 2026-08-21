import type { ReactNode } from "react";
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Card, pillTones, type PillTone } from "@/components/ui";
import { palette, colors, spacing, radius, typography } from "@/theme";

/**
 * Shared list-card system for the app's record lists — consultations, diet
 * plans, lab reports, live classes, workshops, assignments, courses.
 *
 * Every one of those screens had grown its own near-identical "white card with
 * a title, a muted line and maybe a button", which read as flat and made the
 * lists hard to scan. These primitives give them one shape:
 *
 *     ┌──────────────────────────────────────────┐
 *     │ ┌────┐  Title                    ┌────┐  │   DateChip · content · IconTile
 *     │ │ 12 │  meta · meta              │ ic │  │
 *     │ │JUL │                           └────┘  │
 *     │ └────┘                                   │
 *     │  body text …                             │
 *     │  [pill]                        [action]  │   CardFooter
 *     └──────────────────────────────────────────┘
 *
 * Use what a record actually has: a card with no meaningful date should omit
 * the chip rather than invent one.
 */

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

/**
 * The tinted card surface — one spec for every record on every list.
 *
 * There is deliberately no "highlighted card" variant. Which row matters (the
 * next appointment, a live class, an overdue assignment) is said by the pills
 * and the meta lines, not by giving one card different chrome — that made every
 * other card look unfinished by comparison.
 */
export function ListCard({ children }: { children: ReactNode }) {
  return <Card style={styles.card}>{children}</Card>;
}

/**
 * Calendar-style date chip — the left-hand anchor that gives these cards their
 * shape. Navy with white text on every card: the same chip everywhere is what
 * makes the lists read as one system.
 */
export function DateChip({ iso }: { iso: string | null }) {
  const d = iso ? new Date(iso) : null;
  const valid = d != null && !Number.isNaN(d.getTime());
  return (
    <View style={styles.dateChip}>
      <Text style={styles.dateDay}>{valid ? d!.getDate() : "–"}</Text>
      <Text style={styles.dateMon}>{valid ? MONTHS[d!.getMonth()] : ""}</Text>
    </View>
  );
}

/** Tinted square holding the record's category icon. */
export function IconTile({
  icon,
  tone = "navy",
}: {
  icon: keyof typeof Ionicons.glyphMap;
  tone?: PillTone;
}) {
  const t = pillTones[tone];
  return (
    <View style={[styles.iconTile, { backgroundColor: t.bg }]}>
      <Ionicons name={icon} size={17} color={t.fg} />
    </View>
  );
}

export interface MetaItem {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
  /** Override for states that need emphasis, e.g. an overdue date in red. */
  color?: string;
}

/** One or more icon+text meta lines under a title. */
export function MetaLines({ items }: { items: MetaItem[] }) {
  return (
    <>
      {items.map((m, i) => (
        <View key={`${m.icon}-${i}`} style={styles.metaRow}>
          <Ionicons name={m.icon} size={12} color={m.color ?? colors.textMuted} />
          <Text
            style={[styles.metaText, m.color ? { color: m.color } : null]}
            numberOfLines={1}
          >
            {m.text}
          </Text>
        </View>
      ))}
    </>
  );
}

/** The three-part head: optional left chip, title + meta, optional right tile. */
export function CardHead({
  left,
  title,
  titleLines = 2,
  meta,
  right,
}: {
  left?: ReactNode;
  title: string;
  titleLines?: number;
  meta?: MetaItem[];
  right?: ReactNode;
}) {
  return (
    <View style={styles.head}>
      {left}
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.title} numberOfLines={titleLines}>
          {title}
        </Text>
        {meta && meta.length > 0 ? <MetaLines items={meta} /> : null}
      </View>
      {right}
    </View>
  );
}

/**
 * Footer row: status on the left, action on the right.
 *
 * The left slot is always rendered — `justifyContent: space-between` would
 * otherwise pull a lone action button over to the left edge.
 */
export function CardFooter({ left, right }: { left?: ReactNode; right?: ReactNode }) {
  if (!left && !right) return null;
  return (
    <View style={styles.footer}>
      <View style={styles.footerLeft}>{left}</View>
      {right}
    </View>
  );
}

/** Compact pill-shaped action (Download / Join / Open …). */
export function CardAction({
  icon,
  label,
  onPress,
  loading = false,
  disabled = false,
  tone = "navy",
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  /** "gold" for the primary call to action (Join a live class). */
  tone?: "navy" | "gold";
}) {
  const isGold = tone === "gold";
  const fg = isGold ? palette.primary700 : colors.navy;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.action,
        isGold ? styles.actionGold : styles.actionPlain,
        (disabled || loading) && { opacity: 0.5 },
        pressed && { opacity: 0.7 },
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={fg} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={15} color={fg} /> : null}
          <Text style={[styles.actionText, { color: fg }]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

/** Tinted, left-accented block for quoted text (a note, a result, feedback). */
export function Note({
  icon,
  label,
  text,
  tone = "navy",
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  text: string;
  tone?: PillTone;
}) {
  const t = pillTones[tone];
  return (
    <View style={[styles.note, { backgroundColor: t.bg, borderLeftColor: t.fg }]}>
      <View style={styles.noteHead}>
        <Ionicons name={icon} size={12} color={t.fg} />
        <Text style={[styles.noteLabel, { color: t.fg }]}>{label}</Text>
      </View>
      <Text style={styles.noteText}>{text}</Text>
    </View>
  );
}

/** Plain readable block on the card surface — for body text that IS the record. */
export function CardBlock({ children }: { children: ReactNode }) {
  return <View style={styles.block}>{children}</View>;
}

/**
 * Description / body paragraph on its own soft surface.
 *
 * A bare <Text> on the card was the flattest element on every non-consultation
 * card — the consultation card only looked richer because its symptoms and
 * feedback sat in tinted Note blocks. This gives ordinary descriptions the same
 * treatment without needing an icon and a label.
 */
export function CardDescription({
  text,
  numberOfLines = 3,
}: {
  text: string;
  numberOfLines?: number;
}) {
  return (
    <View style={styles.description}>
      <Text style={styles.descriptionText} numberOfLines={numberOfLines}>
        {text}
      </Text>
    </View>
  );
}

/** Section wrapper: SectionHeader supplies its own bottom margin, so this only
 *  spaces the cards from one another. */
export const groupStyle = { gap: spacing.sm } as const;

const styles = StyleSheet.create({
  // Warm tint rather than plain white: on the app's cool grey page background
  // it separates a record from the page and stops long lists reading as a
  // stack of empty boxes.
  card: {
    gap: spacing.md,
    backgroundColor: palette.accent50,
    // Visible gold edge on every card — the same colour and thickness across
    // all the lists, so no card reads as "the plain one".
    borderColor: palette.accent300,
    borderWidth: 1.5,
  },

  head: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  title: { ...typography.h2, color: colors.ink, fontSize: 14.5, lineHeight: 20 },

  metaRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  metaText: { ...typography.caption, color: colors.textMuted, flexShrink: 1 },

  iconTile: {
    width: 38, height: 38, borderRadius: radius.md,
    alignItems: "center", justifyContent: "center",
  },

  dateChip: {
    width: 44, paddingVertical: 6, borderRadius: radius.md,
    backgroundColor: colors.navy,
    alignItems: "center", justifyContent: "center",
  },
  dateDay: { fontSize: 17, lineHeight: 21, fontWeight: "800", color: colors.textInverse },
  dateMon: {
    fontSize: 10, lineHeight: 13, fontWeight: "700", color: colors.navyTint,
    textTransform: "uppercase", letterSpacing: 0.4,
  },

  footer: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", gap: spacing.sm,
  },
  footerLeft: { flexDirection: "row", alignItems: "center", gap: spacing.sm, flexShrink: 1 },

  action: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: spacing.md, height: 34, borderRadius: radius.pill,
  },
  actionPlain: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  actionGold: { backgroundColor: palette.accent300 },
  actionText: { ...typography.label },

  note: { borderLeftWidth: 3, borderRadius: radius.sm, padding: spacing.sm, gap: 3 },
  noteHead: { flexDirection: "row", alignItems: "center", gap: 5 },
  noteLabel: {
    ...typography.caption, fontWeight: "700",
    textTransform: "uppercase", letterSpacing: 0.4,
  },
  noteText: { ...typography.body, color: colors.text, fontSize: 13, lineHeight: 19 },

  block: {
    backgroundColor: colors.card, borderRadius: radius.sm,
    borderWidth: 1, borderColor: colors.border, padding: spacing.md,
  },

  // Lighter than `block` — no border, so a one-line description does not read
  // as a boxed-in panel.
  description: {
    backgroundColor: colors.card, borderRadius: radius.sm,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  descriptionText: { ...typography.body, color: colors.text, fontSize: 13, lineHeight: 19 },
});
