interface PromptSuggestionsProps {
  label: string;
  append: (messageToSend: string) => void;
  suggestions: string[];
  buttonDisabled: boolean;
}

export function PromptSuggestions({ label, append, suggestions, buttonDisabled }: PromptSuggestionsProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-center text-2xl font-bold">{label}</h2>
      <div className="flex gap-6 text-sm">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion}
            onClick={() => append(suggestion)}
            disabled={buttonDisabled}
            className="h-max flex-1 rounded-xl border bg-background p-4 hover:bg-muted disabled:opacity-50    
                      disabled:cursor-not-allowed disabled:bg-muted disabled:text-gray-400 "
          >
            <p>{suggestion}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
