import { Text, View } from "react-native";
import { Image } from "expo-image";
import { useTranslation } from "react-i18next";
import { PNGIMAGES } from "@/shared/constants/assets";

type Props = {
  displayMonth: string;
  recipientName: string;
  body: string;
};

const MAX_EXCERPT_LENGTH = 520;

const createExcerpt = (body: string) => {
  const normalizedBody = body.replace(/\s+/g, " ").trim();

  if (normalizedBody.length <= MAX_EXCERPT_LENGTH) {
    return normalizedBody;
  }

  return `${normalizedBody.slice(0, MAX_EXCERPT_LENGTH).trim()}...`;
};

export function MonthlyReviewShareCard({ displayMonth, recipientName, body }: Props) {
  const { t } = useTranslation("settings");
  const excerpt = createExcerpt(body);

  return (
    <View
      collapsable={false}
      style={{
        width: 360,
        height: 640,
        backgroundColor: "#FFFBF3",
        paddingHorizontal: 28,
        paddingTop: 30,
        paddingBottom: 28,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View
            style={{
              width: 42,
              height: 42,
              borderRadius: 21,
              backgroundColor: "#FFFFFF",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Image
              source={PNGIMAGES.blotzIcon}
              style={{ width: 30, height: 30 }}
              contentFit="contain"
            />
          </View>
          <View style={{ marginLeft: 12 }}>
            <Text
              style={{
                fontFamily: "Baloo2-Regular",
                fontSize: 10,
                color: "rgba(54, 56, 83, 0.55)",
              }}
            >
              {t("monthlyReview.shareCard.label")}
            </Text>
            <Text style={{ fontFamily: "Baloo-Bold", fontSize: 16, color: "#363853" }}>Blotz</Text>
          </View>
        </View>
        <Text style={{ fontFamily: "Baloo-Bold", fontSize: 15, color: "#363853" }}>
          {displayMonth}
        </Text>
      </View>

      <View style={{ height: 1, backgroundColor: "rgba(54, 56, 83, 0.1)", marginVertical: 24 }} />

      <Text style={{ fontFamily: "Baloo-Bold", fontSize: 30, lineHeight: 36, color: "#363853" }}>
        {t("monthlyReview.shareCard.title")}
      </Text>
      <Text
        style={{
          fontFamily: "Baloo2-Regular",
          fontSize: 15,
          lineHeight: 22,
          color: "rgba(54, 56, 83, 0.72)",
          marginTop: 10,
        }}
      >
        {t("monthlyReview.greeting", { name: recipientName })}
      </Text>

      <View
        style={{
          marginTop: 24,
          borderRadius: 22,
          backgroundColor: "#FFFFFF",
          paddingHorizontal: 22,
          paddingVertical: 22,
        }}
      >
        <Text
          numberOfLines={12}
          ellipsizeMode="tail"
          style={{ fontFamily: "Baloo2-Regular", fontSize: 16, lineHeight: 25, color: "#363853" }}
        >
          {excerpt}
        </Text>
      </View>

      <View style={{ flex: 1 }} />

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: 26,
        }}
      >
        <View style={{ flex: 1, paddingRight: 20 }}>
          <Text style={{ fontFamily: "Baloo-Bold", fontSize: 18, color: "#363853" }}>
            {t("monthlyReview.shareCard.footerTitle")}
          </Text>
          <Text
            style={{
              fontFamily: "Baloo2-Regular",
              fontSize: 12,
              lineHeight: 18,
              color: "rgba(54, 56, 83, 0.6)",
              marginTop: 4,
            }}
          >
            {t("monthlyReview.shareCard.footerText")}
          </Text>
        </View>
        <Image
          source={PNGIMAGES.successBun}
          style={{ width: 64, height: 64 }}
          contentFit="contain"
        />
      </View>
    </View>
  );
}
