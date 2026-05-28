import { useEffect, useState } from "react";
import { checkForUpdate } from "@/shared/services/version-service";

export enum UpdateCheckStatus {
  Pending = "pending",
  UpToDate = "upToDate",
  Outdated = "outdated",
  ForceUpdate = "forcedUpdate",
}

type UpdateCheckState =
  | { status: UpdateCheckStatus.Pending }
  | { status: UpdateCheckStatus.UpToDate }
  | { status: UpdateCheckStatus.Outdated; storeUrl: string }
  | { status: UpdateCheckStatus.ForceUpdate; storeUrl: string };

export function useUpdateCheck(): UpdateCheckState {
  const [state, setState] = useState<UpdateCheckState>({ status: UpdateCheckStatus.Pending });

  useEffect(() => {
    checkForUpdate()
      .then((result) => {
        if (result.kind === "forcedUpdate") {
          setState({ status: UpdateCheckStatus.ForceUpdate, storeUrl: result.storeUrl });
        } else if (result.kind === "upToDate") {
          setState({ status: UpdateCheckStatus.UpToDate });
        } else {
          setState({ status: UpdateCheckStatus.Outdated, storeUrl: result.storeUrl });
        }
      })
      .catch(() => {
        // Fail open — network errors should not block the user
        setState({ status: UpdateCheckStatus.UpToDate });
      });
  }, []);

  return state;
}
