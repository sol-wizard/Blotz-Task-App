import {
  ABOUT_YOU_QUESTIONS,
  type AboutYouQuestion,
} from "@/feature/onboarding/about-you/about-you-questions";
import { GradientColor } from "@/shared/components/gradient-color";
import type { AboutYouAudience } from "@/shared/constants/posthog-events";
import { analytics } from "@/shared/services/analytics";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type AboutYouScreenProps = {
  audience: AboutYouAudience;
  /** Called once, after the last question is answered or skipped. */
  onDone: () => void | Promise<void>;
};

/** The "About you" questions, one per page. Every question can be skipped on its own. */
export default function AboutYouScreen({ audience, onDone }: AboutYouScreenProps) {
  const { t } = useTranslation("onboarding");
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [isFinishing, setIsFinishing] = useState(false);

  const question: AboutYouQuestion = ABOUT_YOU_QUESTIONS[index];
  const isLast = index === ABOUT_YOU_QUESTIONS.length - 1;
  const questionText = (path: string) => t(`about-you.questions.${question.key}.${path}`);

  const goNext = () => {
    if (!isLast) {
      setIndex(index + 1);
      setSelected([]);
      return;
    }
    setIsFinishing(true);
    void onDone();
  };

  const toggleOption = (option: string) => {
    if (!question.multiSelect) {
      setSelected([option]);
      return;
    }
    setSelected((prev) => {
      if (prev.includes(option)) return prev.filter((o) => o !== option);
      if (option === question.exclusiveOption) return [option];
      return [...prev.filter((o) => o !== question.exclusiveOption), option];
    });
  };

  const handleSubmit = () => {
    if (selected.length === 0 || isFinishing) return;
    analytics.trackAboutYouAnswered({
      question: question.key,
      property: question.property,
      // Config order, not tap order, so the same picks always save as the same value.
      answer: question.multiSelect
        ? question.options.filter((option) => selected.includes(option))
        : selected[0],
      audience,
    });
    goNext();
  };

  const handleSkip = () => {
    if (isFinishing) return;
    analytics.trackAboutYouSkipped({ question: question.key, audience });
    goNext();
  };

  const canSubmit = selected.length > 0 && !isFinishing;

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-row items-center px-6 h-12" style={{ overflow: "visible" }}>
        <View className="flex-1" />
        <GradientColor className="h-[45px] w-[135px] overflow-visible">
          <View className="flex-1 flex-row justify-center items-center bg-transparent">
            <Text className="text-[30px] leading-11 font-balooExtraBold text-center">Blotz</Text>
          </View>
        </GradientColor>
        <View className="flex-1 items-end">
          <Pressable onPress={handleSkip} hitSlop={10} disabled={isFinishing}>
            <Text className="text-xl font-baloo text-black/40">{t("about-you.skip")}</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="px-6 pt-10 pb-6">
        <Text className="text-sm font-baloo text-black/40 mb-2">
          {index + 1} / {ABOUT_YOU_QUESTIONS.length}
        </Text>
        <Text className="text-2xl font-balooBold text-black mb-2">{questionText("title")}</Text>
        {question.multiSelect && (
          <Text className="text-base font-baloo text-black/40 mb-2">
            {t("about-you.multiSelectHint")}
          </Text>
        )}

        <View className="mt-4 gap-3">
          {question.options.map((option) => {
            const isSelected = selected.includes(option);
            return (
              <Pressable
                key={option}
                onPress={() => toggleOption(option)}
                disabled={isFinishing}
                className={`rounded-2xl border-2 px-5 py-4 ${
                  isSelected ? "border-[#8BCC5A] bg-[#8BCC5A]/10" : "border-gray-200 bg-white"
                }`}
              >
                <Text className="text-base font-baloo text-black">
                  {questionText(`options.${option}`)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View className="items-center pb-8 px-6">
        <View className="flex-row items-center mb-6">
          {ABOUT_YOU_QUESTIONS.map((q, i) => (
            <View
              key={q.key}
              className={`${i === index ? "w-2 bg-black" : "w-2 bg-gray-300"} h-2 rounded-full ${
                i < ABOUT_YOU_QUESTIONS.length - 1 ? "mr-2" : ""
              }`}
            />
          ))}
        </View>
        <Pressable
          onPress={handleSubmit}
          disabled={!canSubmit}
          className={`w-[46%] h-[48px] rounded-full py-4 ${
            canSubmit ? "bg-[#8BCC5A]" : "bg-gray-200"
          }`}
        >
          <Text className="text-white text-lg font-baloo text-center">
            {isLast ? t("about-you.done") : t("about-you.next")}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
