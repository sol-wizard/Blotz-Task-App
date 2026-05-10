import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useUserProfile } from "@/shared/hooks/useUserProfile";
import { LetterBody } from "../components/letter-body";
import { LetterEmptyState } from "../components/letter-empty-state";
import { LetterHeader } from "../components/letter-header";
import { LetterPaper } from "../components/letter-paper";
import { LetterSignature } from "../components/letter-signature";
import { MonthSelector } from "../components/month-selector";
import { useMonthlyReport } from "../hooks/useMonthlyReport";
import { formatMonthLabel } from "../utils/month-utils";

export default function MonthlyReviewScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation("settings");
  const { userProfile } = useUserProfile();
  const { selectedMonth, report, isAtCurrentMonth, goPrev, goNext } = useMonthlyReport();

  const monthLabel = formatMonthLabel(selectedMonth, i18n.language);
  const recipientName = userProfile?.displayName ?? "Friend";

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-row items-center px-5 py-4">
        <Pressable onPress={() => router.back()} className="mr-4">
          <MaterialCommunityIcons name="arrow-left" size={24} color="#363853" />
        </Pressable>
        <Text className="text-2xl font-balooBold text-secondary">
          {t("monthlyReview.title")}
        </Text>
      </View>

      <View className="px-5 mb-4">
        <MonthSelector
          label={monthLabel}
          onPrev={goPrev}
          onNext={goNext}
          disableNext={isAtCurrentMonth}
        />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 48 }}>
        <View className="px-5">
          <LetterPaper>
            <LetterHeader monthLabel={monthLabel} />
            {report ? (
              <>
                <LetterBody
                  recipientName={recipientName}
                  summary={report.summary}
                  closing={report.closing}
                />
                <LetterSignature />
              </>
            ) : (
              <LetterEmptyState />
            )}
          </LetterPaper>

          <Text className="text-xs font-baloo text-secondary/50 text-center mt-8 px-4">
            {t("monthlyReview.footnote")}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
