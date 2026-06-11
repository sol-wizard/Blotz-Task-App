import { createElement } from "react";
import { Image } from "expo-image";
import { getLocalAvatarComponent } from "@/feature/settings/constants/local-avatar-catalog";
import { PNGIMAGES } from "@/shared/constants/assets";

type Props = {
  /** Local avatar id (e.g. "avatar3"), remote image URL, or null for the Blotz fallback. */
  pictureValue: string | null | undefined;
  size: number;
};

export function UserAvatar({ pictureValue, size }: Props) {
  const LocalComp = getLocalAvatarComponent(pictureValue);
  if (LocalComp) {
    return createElement(LocalComp, { width: size, height: size });
  }
  const source = pictureValue ? { uri: pictureValue } : PNGIMAGES.blotzIcon;
  return (
    <Image
      source={source}
      style={{ width: size, height: size, borderRadius: size / 2 }}
      contentFit="cover"
    />
  );
}
