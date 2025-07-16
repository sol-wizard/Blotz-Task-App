import { PromptSuggestions } from '@/components/ui/prompt-suggestions';

const ChatStartScreen = ({ appendToChat }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-4">
      <div className="space-y-3 mb-8">
        <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 leading-tight">
          What&#39;s your next big goal?
        </h1>
        <p className="text-lg md:text-xl text-gray-600">
          I&#39;ll help you break it down into actionable tasks.
        </p>
      </div>

      <PromptSuggestions
        label="Or, get started with these examples:"
        append={appendToChat}
        suggestions={[
          'Plan a 2-day hiking trip to the Blue Mountains for this coming weekend.',
          'I want to learn to bake sourdough bread this weekend.',
          'Improve my public speaking skills for a presentation by next week.',
        ]}
      />
    </div>
  );
};

export default ChatStartScreen;
