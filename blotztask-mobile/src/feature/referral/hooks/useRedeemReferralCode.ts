import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useBadgeQueueStore } from "@/feature/badge/hooks/useBadgeQueueStore";
import { badgeKeys } from "@/shared/constants/query-key-factory";
import { redeemReferralCode } from "../services/referral-service";

export const REDEEM_REFERRAL_CODE_MUTATION_KEY = ["referral", "redeem"];

export const useRedeemReferralCode = () => {
  const queryClient = useQueryClient();
  const enqueueBadge = useBadgeQueueStore((state) => state.enqueue);

  const mutation = useMutation({
    mutationKey: REDEEM_REFERRAL_CODE_MUTATION_KEY,
    mutationFn: (code: string) => redeemReferralCode(code),
    onSuccess: ({ badge }) => {
      if (!badge) return;

      // The badge comes in the response, not a push, so the pop-up shows even with notifications off.
      enqueueBadge({
        badgeId: badge.id,
        name: badge.name,
        description: badge.description,
        iconUrl: badge.iconUrl,
        obtainedAt: new Date(badge.obtainedAt),
      });
      queryClient.invalidateQueries({ queryKey: badgeKeys.all });
    },
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
