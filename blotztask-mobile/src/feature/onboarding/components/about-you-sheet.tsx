import { SHOW_ABOUT_YOU_TO_EXISTING_USERS } from "@/feature/onboarding/about-you/about-you-questions";
import { useAboutYouSeen } from "@/feature/onboarding/hooks/useAboutYouSeen";
import AboutYouScreen from "@/feature/onboarding/screens/about-you-screen";
import { View } from "react-native";
import { useAuth0 } from "react-native-auth0";
import Modal from "react-native-modal";

/**
 * Asks existing users the "About you" questions once, as a closable sheet over the home
 * screen. New users already answered them in onboarding, so their flag is already set.
 * Finishing, skipping every question and closing the sheet all count as seen.
 */
export function AboutYouSheet() {
  const { user } = useAuth0();
  const { hasSeen, markAsSeen } = useAboutYouSeen(user?.sub);
  const isVisible = SHOW_ABOUT_YOU_TO_EXISTING_USERS && hasSeen === false;

  const close = () => {
    void markAsSeen();
  };

  return (
    <Modal
      isVisible={isVisible}
      onBackdropPress={close}
      onBackButtonPress={close}
      backdropOpacity={0.4}
      animationIn="slideInUp"
      animationOut="slideOutDown"
      useNativeDriver
      statusBarTranslucent
      style={{ margin: 0 }}
    >
      <View className="mt-auto h-[88%] bg-white rounded-t-3xl overflow-hidden">
        <AboutYouScreen audience="existing_user" onDone={close} onClose={close} />
      </View>
    </Modal>
  );
}
