import { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ErrorCode, useIAP } from "expo-iap";
import * as Haptics from "expo-haptics";
import LottieView from "lottie-react-native";
import Toast from "react-native-toast-message";
import { useTranslation } from "react-i18next";
import { ReturnButton } from "@/shared/components/return-button";
import LoadingScreen from "@/shared/components/loading-screen";
import { ASSETS } from "@/shared/constants/assets";

// Must match the Consumable product IDs created in App Store Connect.
// Array order is the display order — the store returns products unordered.
const TIPS = [
  { sku: "com.Blotz.BlotzTask.tip.coffee", emoji: "☕️" },
  { sku: "com.Blotz.BlotzTask.tip.lunch", emoji: "🍱" },
];

export default function SettingsSupportUsScreen() {
  const { t } = useTranslation("settings");
  const [status, setStatus] = useState<"loading" | "ready" | "unavailable">("loading");
  const [pendingSku, setPendingSku] = useState<string | null>(null);
  const [showThanks, setShowThanks] = useState(false);

  const { connected, products, fetchProducts, requestPurchase, finishTransaction } = useIAP({
    onPurchaseSuccess: async (purchase) => {
      await finishTransaction({ purchase, isConsumable: true });
      setPendingSku(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      setShowThanks(true);
    },
    onPurchaseError: (error) => {
      setPendingSku(null);
      // Backing out of the StoreKit sheet is not an error worth surfacing.
      if (error.code === ErrorCode.UserCancelled) return;
      Toast.show({ type: "error", text1: t("supportUs.failed") });
    },
    onError: () => setStatus("unavailable"),
  });

  useEffect(() => {
    if (!connected) return;
    fetchProducts({ skus: TIPS.map((tip) => tip.sku), type: "in-app" })
      .then(() => setStatus("ready"))
      .catch(() => setStatus("unavailable"));
  }, [connected, fetchProducts]);

  const handleTip = async (sku: string) => {
    setPendingSku(sku);
    try {
      // The outcome arrives via onPurchaseSuccess / onPurchaseError, never from this call.
      await requestPurchase({ request: { apple: { sku } }, type: "in-app" });
    } catch {
      setPendingSku(null);
      Toast.show({ type: "error", text1: t("supportUs.failed") });
    }
  };

  if (status === "loading") {
    return <LoadingScreen />;
  }

  // Empty products with no error means the SKUs are not live in App Store Connect yet.
  const isUnavailable = status === "unavailable" || products.length === 0;

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-row px-6 pt-6">
        <ReturnButton />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-3xl font-balooExtraBold text-secondary">{t("supportUs.title")}</Text>
        <Text className="text-base font-baloo text-gray-500 mt-2 leading-6">
          {t("supportUs.blurb")}
        </Text>

        {isUnavailable ? (
          <View className="bg-white rounded-2xl px-6 py-8 mt-6">
            <Text className="text-base font-baloo text-gray-500 text-center">
              {t("supportUs.unavailable")}
            </Text>
          </View>
        ) : (
          <View className="gap-3 mt-6">
            {TIPS.map((tip) => {
              const product = products.find((candidate) => candidate.id === tip.sku);
              if (!product) return null;

              return (
                <Pressable
                  key={tip.sku}
                  onPress={() => handleTip(tip.sku)}
                  disabled={pendingSku !== null}
                  className={`flex-row items-center bg-white rounded-2xl px-5 py-4 ${
                    pendingSku === tip.sku ? "opacity-50" : ""
                  }`}
                  style={{ borderCurve: "continuous" }}
                >
                  <Text className="text-3xl">{tip.emoji}</Text>
                  <View className="flex-1 pl-4 pr-3">
                    <Text className="text-lg font-balooBold text-secondary">{product.title}</Text>
                    <Text className="text-sm font-baloo text-gray-400 mt-0.5">
                      {product.description}
                    </Text>
                  </View>
                  <View className="bg-[#ECF6E3] px-4 py-2 rounded-full">
                    <Text className="text-base font-balooBold text-[#9AD513]">
                      {product.displayPrice}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

        <Text className="text-xs font-baloo text-gray-400 text-center mt-6 leading-5">
          {t("supportUs.disclaimer")}
        </Text>
      </ScrollView>

      <Modal
        transparent
        visible={showThanks}
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setShowThanks(false)}
      >
        <Pressable
          className="flex-1 bg-black/50 items-center justify-center px-8"
          onPress={() => setShowThanks(false)}
        >
          <LottieView
            source={ASSETS.badgeCelebration}
            autoPlay
            loop={false}
            resizeMode="cover"
            onAnimationFinish={(isCancelled) => {
              if (!isCancelled) setShowThanks(false);
            }}
            style={[StyleSheet.absoluteFill, { pointerEvents: "none" }]}
          />
          <Text className="text-3xl font-balooExtraBold text-white text-center">
            {t("supportUs.thanks")}
          </Text>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
