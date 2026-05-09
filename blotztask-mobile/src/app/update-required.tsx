import { useLocalSearchParams } from "expo-router";
import { UpdateRequiredScreen } from "@/shared/components/update-required-screen";

export default function UpdateRequiredRoute() {
  const { storeUrl } = useLocalSearchParams<{ storeUrl: string }>();

  return <UpdateRequiredScreen storeUrl={storeUrl ?? ""} />;
}
