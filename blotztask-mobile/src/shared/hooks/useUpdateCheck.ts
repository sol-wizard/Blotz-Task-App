import { useEffect, useState } from "react";
import { checkForUpdate } from "@/shared/services/version-service";

type UpdateCheckState =
  | { status: "pending" }
  | { status: "upToDate" }
  | { status: "outdated"; storeUrl: string };

export function useUpdateCheck(): UpdateCheckState {
  const [state, setState] = useState<UpdateCheckState>({ status: "pending" });

  useEffect(() => {
    checkForUpdate()
      .then(({ isUpToDate, storeUrl }) => {
        if (isUpToDate) {
          setState({ status: "upToDate" });
        } else {
          setState({ status: "outdated", storeUrl: storeUrl ?? "" });
        }
      })
      .catch(() => {
        // Fail open — network errors should not block the user
        setState({ status: "upToDate" });
      });
  }, []);
  console.log("Update check state:", state);
  return state;
}
