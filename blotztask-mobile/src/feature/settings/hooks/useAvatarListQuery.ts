import { AvatarDTO } from "@/feature/settings/modals/avatar-dto";
import { LOCAL_AVATARS } from "@/feature/settings/constants/local-avatar-catalog";

export function useAvatarListQuery() {
  return {
    avatars: LOCAL_AVATARS as AvatarDTO[],
  };
}
