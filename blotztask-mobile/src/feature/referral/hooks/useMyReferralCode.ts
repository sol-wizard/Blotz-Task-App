import { useQuery } from "@tanstack/react-query";
import { fetchMyReferralCode } from "../services/referral-service";

const referralKeys = {
  myCode: ["referral", "my-code"] as const,
};

export const useMyReferralCode = () => {
  const { data, isLoading } = useQuery({
    queryKey: referralKeys.myCode,
    queryFn: () => fetchMyReferralCode(),
  });

  return {
    referralCode: data?.code ?? null,
    isLoading,
  };
};
