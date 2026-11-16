import { useEffect } from "react";
import { queryOptions, useQuery, type QueryClient } from "@tanstack/react-query";
import { router, useSegments } from "expo-router";
import { appVersionKeys } from "@/shared/constants/query-key-factory";
import {
  evaluateVersionPolicy,
  fetchAndSaveVersionPolicy,
  loadSavedVersionPolicy,
  type UpdateCheckResult,
} from "@/shared/services/version-service";

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

// Fetched once per process. Fail open and quietly: a network error must not block the user
// or show a toast.
const latestPolicyQuery = queryOptions({
  queryKey: appVersionKeys.latest(),
  queryFn: fetchAndSaveVersionPolicy,
  staleTime: Infinity,
  gcTime: Infinity,
  meta: { silent: true },
});

const savedPolicyQuery = queryOptions({
  queryKey: appVersionKeys.saved(),
  queryFn: loadSavedVersionPolicy,
  staleTime: Infinity,
  gcTime: Infinity,
});

/** Starts the check at bundle load, so it runs while the auth check is still going. */
export function prefetchVersionPolicy(queryClient: QueryClient) {
  void queryClient.prefetchQuery(latestPolicyQuery);
}

function toState(result: UpdateCheckResult): UpdateCheckState {
  if (result.kind === "forcedUpdate") {
    return { status: UpdateCheckStatus.ForceUpdate, storeUrl: result.storeUrl };
  }
  if (result.kind === "outdated") {
    return { status: UpdateCheckStatus.Outdated, storeUrl: result.storeUrl };
  }
  return { status: UpdateCheckStatus.UpToDate };
}

/**
 * The splash decision. Uses the server's answer if it has already arrived, otherwise the one
 * saved by the last launch, so the splash waits for local storage only, never the network.
 */
export function useUpdateCheck(): UpdateCheckState {
  const latest = useQuery(latestPolicyQuery);
  const saved = useQuery(savedPolicyQuery);

  if (latest.data !== undefined) return toState(evaluateVersionPolicy(latest.data));
  if (saved.isPending) return { status: UpdateCheckStatus.Pending };
  return toState(evaluateVersionPolicy(saved.data ?? null));
}

/** The server's answer for this session, or `undefined` until it has arrived. */
export function useLatestUpdateCheck(): UpdateCheckResult | undefined {
  const { data } = useQuery(latestPolicyQuery);
  return data === undefined ? undefined : evaluateVersionPolicy(data);
}

/**
 * A forced update that arrives after the splash sends the user to the update screen at once.
 * An optional one is only saved, so it shows at the next launch and never interrupts.
 */
export function useForcedUpdateRedirect() {
  const latest = useLatestUpdateCheck();
  // Segments, not the pathname: groups are dropped from paths, so the Today tab is "/" too.
  const [area] = useSegments();
  const forcedStoreUrl = latest?.kind === "forcedUpdate" ? latest.storeUrl : null;

  useEffect(() => {
    // Only inside the app. The splash decides on its own, and the update screen follows
    // the latest answer itself.
    if (forcedStoreUrl === null || (area !== "(protected)" && area !== "(auth)")) return;
    router.replace({
      pathname: "/update-required",
      params: { storeUrl: forcedStoreUrl, forced: "true" },
    });
  }, [forcedStoreUrl, area]);
}
