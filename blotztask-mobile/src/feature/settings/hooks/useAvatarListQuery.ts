import { useQuery } from "@tanstack/react-query";
import { AvatarDTO } from "@/feature/settings/modals/avatar-dto";
import { avatarKeys } from "@/shared/constants/query-key-factory";

const AVATAR_LIST_URL = process.env.EXPO_PUBLIC_AVATAR_LIST_URL;

type AvatarListDTO = {
  version: number;
  avatars: AvatarDTO[];
};

function isAvatarDTO(value: unknown): value is AvatarDTO {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.id === "string" &&
    typeof candidate.label === "string" &&
    typeof candidate.url === "string"
  );
}

function isAvatarListDTO(value: unknown): value is AvatarListDTO {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.version === "number" &&
    Array.isArray(candidate.avatars) &&
    candidate.avatars.every((avatar) => isAvatarDTO(avatar))
  );
}

async function fetchAvatarList(): Promise<AvatarListDTO> {
  if (!AVATAR_LIST_URL) {
    throw new Error("Avatar list URL is not configured.");
  }

  const response = await fetch(AVATAR_LIST_URL);

  if (!response.ok) {
    throw new Error("Failed to fetch avatar list.");
  }

  const data: unknown = await response.json();

  if (!isAvatarListDTO(data)) {
    throw new Error("Invalid avatar list response.");
  }

  return data;
}

export function useAvatarListQuery() {
  const avatarListQuery = useQuery<AvatarListDTO>({
    queryKey: avatarKeys.all,
    queryFn: () => fetchAvatarList(),
  });

  return {
    avatars: avatarListQuery.data?.avatars ?? [],
    isAvatarListLoading: avatarListQuery.isLoading,
    isAvatarListError: avatarListQuery.isError,
  };
}
