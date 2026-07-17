import { useQuery } from "@tanstack/react-query";
import { fetchMyInviteCode } from "../services/invite-service";

const inviteKeys = {
  myCode: ["invite", "my-code"] as const,
};

export const useMyInviteCode = () => {
  const { data, isLoading } = useQuery({
    queryKey: inviteKeys.myCode,
    queryFn: () => fetchMyInviteCode(),
  });

  return {
    inviteCode: data?.code ?? null,
    isLoading,
  };
};
