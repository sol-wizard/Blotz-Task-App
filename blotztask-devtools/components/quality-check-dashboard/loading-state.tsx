export const LoadingState = () => {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-600 border-t-emerald-400" />
      <p className="text-sm text-zinc-400">
        Running eval cases — this may take 20-30 seconds...
      </p>
    </div>
  );
};
