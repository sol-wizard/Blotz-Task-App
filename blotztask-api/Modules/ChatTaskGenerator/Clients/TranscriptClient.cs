using Azure;
using Azure.AI.OpenAI;
using OpenAI.Audio;

namespace BlotzTask.Modules.ChatTaskGenerator.Clients;

public class TranscriptClient
{
    private readonly AudioClient _audioClient;

    public TranscriptClient(string endpoint, string apiKey, string deploymentId)
    {
        var client = new AzureOpenAIClient(new Uri(endpoint), new AzureKeyCredential(apiKey));
        _audioClient = client.GetAudioClient(deploymentId);
    }

    public AudioClient GetAudioClient() => _audioClient;
}