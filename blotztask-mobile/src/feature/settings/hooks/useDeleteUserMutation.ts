import { useMutation } from "@tanstack/react-query";
import { deleteUser } from "@/shared/services/user-service";
import { userKeys } from "@/shared/constants/query-key-factory";

export function useDeleteUserMutation() {
  const mutation = useMutation({
    mutationKey: userKeys.delete(),
    mutationFn: () => deleteUser(),
  });

  return {
    mutate: mutation.mutateAsync,
    isPending: mutation.isPending,
  };
}
