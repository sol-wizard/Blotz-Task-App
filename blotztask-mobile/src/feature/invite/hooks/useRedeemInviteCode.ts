import { useMutation } from "@tanstack/react-query";
import { redeemInviteCode } from "../services/invite-service";

export const useRedeemInviteCode = () => {
  const mutation = useMutation({
    mutationFn: (code: string) => redeemInviteCode(code),
    meta: { errorNs: "invite" },
  });

  return {
    redeemInviteCode: mutation.mutate,
    isRedeeming: mutation.isPending,
    isSuccess: mutation.isSuccess,
    error: mutation.error,
  };
};
