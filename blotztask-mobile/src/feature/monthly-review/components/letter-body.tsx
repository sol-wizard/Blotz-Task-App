import { Text } from "react-native";
import { useTranslation } from "react-i18next";

type Props = {
  recipientName: string;
  body: string;
};

export function LetterBody({ recipientName, body }: Props) {
  const { t } = useTranslation("settings");

  return (
    <>
      <Text className="text-2xl font-balooBold text-secondary mb-5">
        {t("monthlyReview.greeting", { name: recipientName })}
      </Text>
      <Text
        className="text-[15px] font-baloo text-secondary mb-8"
        style={{ lineHeight: 26 }}
      >
        {body}
      </Text>
    </>
  );
}
