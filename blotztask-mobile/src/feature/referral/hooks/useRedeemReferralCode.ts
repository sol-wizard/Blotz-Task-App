import { useMutation } from "@tanstack/react-query";
import { redeemReferralCode } from "../services/referral-service";

export const REDEEM_REFERRAL_CODE_MUTATION_KEY = ["referral", "redeem"];

export const useRedeemReferralCode = () => {
  const mutation = useMutation({
    mutationKey: REDEEM_REFERRAL_CODE_MUTATION_KEY,
    mutationFn: (code: string) => redeemReferralCode(code),
    meta: {
      errorMap: {
        400: "errors.invite.selfCode",
        403: "errors.invite.onboardingOnly",
        404: "errors.invite.notFound",
        409: "errors.invite.alreadyRedeemed",
      },
    },
  });

  return {
    redeemReferralCode: mutation.mutate,
    isRedeeming: mutation.isPending,
  };
};
