import { useEffect, useState } from "react";
import { checkForUpdate } from "@/shared/services/version-service";

export enum UpdateCheckStatus {
  Pending = "pending",
  UpToDate = "upToDate",
  Outdated = "outdated",
}

type UpdateCheckState =
  | { status: UpdateCheckStatus.Pending }
  | { status: UpdateCheckStatus.UpToDate }
  | { status: UpdateCheckStatus.Outdated; storeUrl: string };

export function useUpdateCheck(): UpdateCheckState {
  const [state, setState] = useState<UpdateCheckState>({ status: UpdateCheckStatus.Pending });

  useEffect(() => {
    checkForUpdate()
      .then(({ isUpToDate, storeUrl }) => {
        if (isUpToDate) {
          setState({ status: UpdateCheckStatus.UpToDate });
        } else {
          setState({ status: UpdateCheckStatus.Outdated, storeUrl: storeUrl ?? "" });
        }
      })
      .catch(() => {
        // Fail open — network errors should not block the user
        setState({ status: UpdateCheckStatus.UpToDate });
      });
  }, []);
  console.log("Update check state:", state);
  return state;
}
