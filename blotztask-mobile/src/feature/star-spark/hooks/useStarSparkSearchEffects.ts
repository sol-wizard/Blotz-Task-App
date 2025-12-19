import { useEffect, useRef, useState } from "react";
import { FloatingTaskDTO } from "../models/floating-task-dto";
import { useFloatingTasksSearch } from "./useFloatingTasksSearch";

export const useStarSparkSearchEffects = ({
  searchQuery,
  floatingTasks,
  isLoadingAll,
  onNotify,
  debouncedMs = 300,
}: {
  searchQuery: string;
  floatingTasks: FloatingTaskDTO[] | undefined;
  isLoadingAll: boolean;
  onNotify: (msg: string) => void;
  debouncedMs?: number;
}) => {
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const trimmedKeyword = searchQuery.trim();
  const hasKeyword = trimmedKeyword.length > 0;

  const lastNotifiedKeyword = useRef<string | null>(null);
  const lastCompletedKeyword = useRef<string | null>(null);


  useEffect(() => {
    if (!hasKeyword) {
      setDebouncedQuery("");
      return;
    }

    const t = setTimeout(() => {
      setDebouncedQuery(trimmedKeyword);
    }, debouncedMs);

    return () => clearTimeout(t);
  }, [trimmedKeyword, hasKeyword, debouncedMs]);


  const {
    data: searchedTasks,
    isLoading: isSearching,
    isError: isSearchError,
    error: searchError,
  } = useFloatingTasksSearch(debouncedQuery);

  const tasksToShow = hasKeyword ? (searchedTasks ?? []) : (floatingTasks ?? []);
  const showLoading = isLoadingAll || (hasKeyword && isSearching);

  useEffect(() => {
    if (isSearchError) {
      onNotify((searchError as any)?.message ?? "Failed to search tasks.");
    }
  }, [isSearchError, searchError, onNotify]);


  useEffect(() => {
    const keywordToNotify = debouncedQuery.trim();
    if (!keywordToNotify) return;

    if (!isSearching && !isSearchError) {
      lastCompletedKeyword.current = keywordToNotify;
    }

    const completed = lastCompletedKeyword.current;

    if (
      completed === keywordToNotify &&
      !isSearching &&
      !isSearchError &&
      searchedTasks &&
      searchedTasks.length === 0 &&
      lastNotifiedKeyword.current !== keywordToNotify
    ) {
      onNotify(`No results for "${keywordToNotify}"`);
      lastNotifiedKeyword.current = keywordToNotify;
    }
  }, [debouncedQuery, isSearching, isSearchError, searchedTasks, onNotify]);

  useEffect(() => {
    if (!hasKeyword) {
      lastNotifiedKeyword.current = null;
      lastCompletedKeyword.current = null;
    }
  }, [hasKeyword]);

  return {
    tasksToShow,
    showLoading,
    hasKeyword,
    debouncedQuery,
  };
};