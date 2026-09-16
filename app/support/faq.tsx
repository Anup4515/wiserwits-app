import { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  LayoutAnimation,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { Card } from "@/components/ui";
import { colors, spacing, typography, radius } from "@/theme";
import { FAQS, FAQ_CATEGORIES, type Faq, type FaqCategory } from "@/lib/support-faqs";

export default function FaqScreen() {
  const router = useRouter();
  const { focus } = useLocalSearchParams<{ focus?: string }>();
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<FaqCategory | "All">("All");
  const [expanded, setExpanded] = useState<Set<string>>(new Set(focus ? [focus] : []));
  const scrollRef = useRef<ScrollView>(null);
  const rowPositions = useRef<Record<string, number>>({});

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return FAQS.filter((f) => {
      if (category !== "All" && f.category !== category) return false;
      if (!query) return true;
      return (
        f.question.toLowerCase().includes(query) ||
        f.answer.toLowerCase().includes(query)
      );
    });
  }, [q, category]);

  const grouped = useMemo(() => {
    const map = new Map<FaqCategory, Faq[]>();
    for (const f of filtered) {
      const list = map.get(f.category) ?? [];
      list.push(f);
      map.set(f.category, list);
    }
    return FAQ_CATEGORIES.map((c) => ({ category: c, items: map.get(c) ?? [] })).filter(
      (g) => g.items.length > 0,
    );
  }, [filtered]);

  useEffect(() => {
    if (!focus) return;
    const y = rowPositions.current[focus];
    if (typeof y === "number") {
      scrollRef.current?.scrollTo({ y: Math.max(0, y - 60), animated: true });
    }
  }, [focus]);

  function toggle(id: string) {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.root}
      contentContainerStyle={styles.pad}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Search FAQs"
          placeholderTextColor="#94a3b8"
          style={styles.searchInput}
          returnKeyType="search"
          autoCorrect={false}
        />
        {q.length > 0 ? (
          <Pressable onPress={() => setQ("")} hitSlop={8} accessibilityLabel="Clear search">
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}
      >
        {(["All", ...FAQ_CATEGORIES] as const).map((c) => {
          const active = category === c;
          return (
            <Pressable
              key={c}
              onPress={() => setCategory(c)}
              style={[styles.chip, active && styles.chipActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{c}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {grouped.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Ionicons name="search-outline" size={28} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>No matches</Text>
          <Text style={styles.emptyText}>
            Try different keywords, or send us a message directly.
          </Text>
          <Pressable
            style={styles.emptyBtn}
            onPress={() => router.push("/support/contact")}
            accessibilityRole="button"
          >
            <Text style={styles.emptyBtnLabel}>Contact support</Text>
          </Pressable>
        </Card>
      ) : (
        grouped.map((group) => (
          <View key={group.category} style={{ gap: spacing.sm }}>
            <Text style={styles.groupHeader}>{group.category}</Text>
            <Card style={styles.listCard}>
              {group.items.map((f, i) => {
                const isOpen = expanded.has(f.id);
                return (
                  <View
                    key={f.id}
                    onLayout={(e) => {
                      rowPositions.current[f.id] = e.nativeEvent.layout.y;
                    }}
                  >
                    {i > 0 ? <View style={styles.divider} /> : null}
                    <Pressable
                      style={styles.qRow}
                      onPress={() => toggle(f.id)}
                      accessibilityRole="button"
                      accessibilityState={{ expanded: isOpen }}
                      accessibilityLabel={f.question}
                    >
                      <Text style={styles.qText}>{f.question}</Text>
                      <Ionicons
                        name={isOpen ? "chevron-up" : "chevron-down"}
                        size={18}
                        color={colors.textMuted}
                      />
                    </Pressable>
                    {isOpen ? <Text style={styles.aText}>{f.answer}</Text> : null}
                  </View>
                );
              })}
            </Card>
          </View>
        ))
      )}

      <Card style={styles.footerCard}>
        <Text style={styles.footerTitle}>Didn't find your answer?</Text>
        <Text style={styles.footerText}>Send us a message and we'll get back within 24 hours.</Text>
        <Pressable
          style={styles.footerBtn}
          onPress={() => router.push("/support/contact")}
          accessibilityRole="button"
        >
          <Ionicons name="chatbubbles-outline" size={18} color={colors.textInverse} />
          <Text style={styles.footerBtnLabel}>Contact support</Text>
        </Pressable>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  pad: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },

  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    height: 44,
  },
  searchInput: { flex: 1, ...typography.body, color: colors.ink, paddingVertical: 0 },

  chipsRow: { gap: spacing.sm, paddingVertical: spacing.xs, paddingRight: spacing.md },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  chipActive: { backgroundColor: colors.navy, borderColor: colors.navy },
  chipLabel: { ...typography.caption, color: colors.ink, fontWeight: "600" },
  chipLabelActive: { color: colors.textInverse },

  groupHeader: {
    ...typography.label,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  listCard: { padding: 0, overflow: "hidden" },
  qRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  qText: { ...typography.body, color: colors.ink, fontWeight: "600", flex: 1 },
  aText: {
    ...typography.body,
    color: colors.text,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  divider: { height: 1, backgroundColor: colors.border, marginLeft: spacing.lg },

  emptyCard: { alignItems: "center", gap: spacing.sm, paddingVertical: spacing.xl },
  emptyTitle: { ...typography.h2, color: colors.ink },
  emptyText: { ...typography.body, color: colors.textMuted, textAlign: "center" },
  emptyBtn: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.pill,
    backgroundColor: colors.navy,
  },
  emptyBtnLabel: { ...typography.label, color: colors.textInverse, fontWeight: "700" },

  footerCard: { gap: spacing.sm, alignItems: "flex-start" },
  footerTitle: { ...typography.h2, color: colors.ink },
  footerText: { ...typography.body, color: colors.textMuted },
  footerBtn: {
    marginTop: spacing.xs,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.pill,
    backgroundColor: colors.navy,
  },
  footerBtnLabel: { ...typography.label, color: colors.textInverse, fontWeight: "700" },
});
