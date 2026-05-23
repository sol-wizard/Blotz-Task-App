import type { FC } from "react";
import type { SvgProps } from "react-native-svg";
import type { AvatarDTO } from "@/feature/settings/modals/avatar-dto";
import Avatar1 from "../../../../assets/avatars/avatar1.svg";
import Avatar2 from "../../../../assets/avatars/avatar2.svg";
import Avatar3 from "../../../../assets/avatars/avatar3.svg";
import Avatar4 from "../../../../assets/avatars/avatar4.svg";
import Avatar5 from "../../../../assets/avatars/avatar5.svg";
import Avatar6 from "../../../../assets/avatars/avatar6.svg";
import Avatar7 from "../../../../assets/avatars/avatar7.svg";
import Avatar8 from "../../../../assets/avatars/avatar8.svg";
import Avatar9 from "../../../../assets/avatars/avatar9.svg";
import Avatar10 from "../../../../assets/avatars/avatar10.svg";
import Avatar11 from "../../../../assets/avatars/avatar11.svg";
import Avatar12 from "../../../../assets/avatars/avatar12.svg";

const LOCAL_AVATAR_COMPONENTS = {
  avatar1: Avatar1,
  avatar2: Avatar2,
  avatar3: Avatar3,
  avatar4: Avatar4,
  avatar5: Avatar5,
  avatar6: Avatar6,
  avatar7: Avatar7,
  avatar8: Avatar8,
  avatar9: Avatar9,
  avatar10: Avatar10,
  avatar11: Avatar11,
  avatar12: Avatar12,
} as const;

export type LocalAvatarId = keyof typeof LOCAL_AVATAR_COMPONENTS;

export const LOCAL_AVATARS: AvatarDTO[] = [
  { id: "avatar1", label: "Avatar1" },
  { id: "avatar2", label: "Avatar2" },
  { id: "avatar3", label: "Avatar3" },
  { id: "avatar4", label: "Avatar4" },
  { id: "avatar5", label: "Avatar5" },
  { id: "avatar6", label: "Avatar6" },
  { id: "avatar7", label: "Avatar7" },
  { id: "avatar8", label: "Avatar8" },
  { id: "avatar9", label: "Avatar9" },
  { id: "avatar10", label: "Avatar10" },
  { id: "avatar11", label: "Avatar11" },
  { id: "avatar12", label: "Avatar12" },
];

function isLocalAvatarId(value: string | null | undefined): value is LocalAvatarId {
  return typeof value === "string" && value in LOCAL_AVATAR_COMPONENTS;
}

export function getLocalAvatarComponent(value: string | null | undefined) {
  if (!isLocalAvatarId(value)) {
    return null;
  }

  return LOCAL_AVATAR_COMPONENTS[value] as FC<SvgProps>;
}
