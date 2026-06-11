import { useLocalSearchParams } from "expo-router";
import { UpdateRequiredScreen } from "@/shared/components/update-required-screen";

export default function UpdateRequiredRoute() {
  const { storeUrl, forced } = useLocalSearchParams<{ storeUrl: string; forced?: string }>();

  return <UpdateRequiredScreen storeUrl={storeUrl ?? ""} forced={forced === "true"} />;
}
