import { useEffect, useState } from "react";
import { checkVersion } from "react-native-check-version";
import Constants, { ExecutionEnvironment } from "expo-constants";
import * as Application from "expo-application";
import * as Localization from "expo-localization";

export function useForceUpdate() {
  const [updateNeeded, setUpdateNeeded] = useState(false);
  const [storeUrl, setStoreUrl] = useState<string>("");

  useEffect(() => {
    async function check() {
      if (Constants.executionEnvironment !== ExecutionEnvironment.Standalone) return;

      try {
        // TODO: before Android launch, evaluate replacing react-native-check-version — its Android
        // provider scrapes the Play Store HTML page which is fragile and may break if Google changes
        // their markup. Consider a dedicated solution for Play Store version checking.
        const region = Localization.getLocales()[0]?.regionCode?.toLowerCase() ?? "us";

        const result = await checkVersion({
          bundleId: Application.applicationId ?? undefined,
          country: region,
        });

        if (result.needsUpdate && result.url) {
          setUpdateNeeded(true);
          setStoreUrl(result.url);
        }
      } catch {
        // Fail silently — don't block the user if the check fails
      }
    }

    check();
  }, []);

  return { updateNeeded, storeUrl };
}
