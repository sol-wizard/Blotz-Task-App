using Microsoft.SemanticKernel.ChatCompletion;
using OpenAI.Chat;

namespace BlotzTask.Shared.Services;

public static class ChatHistoryConverter
{
    public static List<ChatMessage> ToOpenAiChatMessages(this ChatHistory chatHistory)
    {
        var openAiChatMessages = new List<ChatMessage>();
        
        foreach (var chatMessage in chatHistory)
        {
            if (chatMessage.Role == AuthorRole.System)
            {
                openAiChatMessages.Add(new SystemChatMessage(chatMessage.Content));
            }
            else if (chatMessage.Role == AuthorRole.User)
            {
                openAiChatMessages.Add(new UserChatMessage(chatMessage.Content));
            }
            else if (chatMessage.Role == AuthorRole.Assistant)
            {
                openAiChatMessages.Add(new AssistantChatMessage(chatMessage.Content));
            }
            else if (chatMessage.Role == AuthorRole.Tool)
            {
                Console.WriteLine("[Warning] Mapping Tool role as System for now.");
                openAiChatMessages.Add(new SystemChatMessage($"Tool Output: {chatMessage.Content}"));
            }
            else
            {
                Console.WriteLine($"[Warning] Unknown Role: {chatMessage.Role}. Mapping as System.");
                openAiChatMessages.Add(new SystemChatMessage($"Unhandled Role: {chatMessage.Content}"));
            }
        }

        return openAiChatMessages;
    }
}