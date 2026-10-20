import { Pressable, Text, TextInput, View } from "react-native";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { DeleteAccountReason } from "@/shared/constants/posthog-events";

export type PickableReason = Exclude<DeleteAccountReason, "skipped">;

const REASONS: Exclude<PickableReason, "other">[] = [
  "no_longer_needed",
  "too_complicated",
  "missing_feature",
  "ai_not_good",
  "privacy_concern",
  "switched_app",
];

/** Random order so the first option isn't over-picked; "other" always stays last. */
function shuffledReasons(): PickableReason[] {
  const order = [...REASONS];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return [...order, "other"];
}

export const DELETE_REASON_OTHER_MAX_LENGTH = 200;

type Props = {
  reason: PickableReason | null;
  otherText: string;
  onReasonChange: (reason: PickableReason | null) => void;
  onOtherTextChange: (text: string) => void;
};

/**
 * Optional "main reason for deleting" question in the delete-account modal.
 * Answering is never required, and tapping the chosen reason again clears it.
 */
export function DeleteReasonPicker({ reason, otherText, onReasonChange, onOtherTextChange }: Props) {
  const { t } = useTranslation("settings");
  // Shuffled once per mount, so the order doesn't jump while the user is choosing.
  const [reasons] = useState(shuffledReasons);

  return (
    <View className="mt-4">
      <Text className="text-sm font-baloo text-secondary">{t("account.deleteReasonTitle")}</Text>
      <View className="flex-row flex-wrap mt-2">
        {reasons.map((key) => {
          const selected = reason === key;
          return (
            <Pressable
              key={key}
              onPress={() => onReasonChange(selected ? null : key)}
              className={`mr-2 mb-2 px-3 py-1 rounded-full border ${
                selected ? "bg-secondary border-secondary" : "border-gray-300"
              }`}
            >
              <Text className={`text-xs font-baloo ${selected ? "text-white" : "text-secondary"}`}>
                {t(`account.deleteReasons.${key}`)}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {reason === "other" ? (
        <TextInput
          value={otherText}
          onChangeText={onOtherTextChange}
          maxLength={DELETE_REASON_OTHER_MAX_LENGTH}
          placeholder={t("account.deleteReasonOtherPlaceholder")}
          multiline
          className="mt-1 border border-gray-300 rounded-xl px-3 py-2 text-sm font-baloo text-secondary max-h-24"
        />
      ) : null}
    </View>
  );
}
