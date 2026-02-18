using System.ComponentModel;
using System.Text.Json.Serialization;

namespace BlotzTask.Modules.ChatTaskGenerator.Dtos;

public class PcmAudioChunk
{
    [JsonPropertyName("dataBase64")]
    [Description("Base64 encoded PCM audio bytes.")]
    public string DataBase64 { get; set; } = string.Empty;

    [JsonPropertyName("position")]
    [Description("Current chunk byte position in the recording stream.")]
    public long Position { get; set; }

    [JsonPropertyName("eventDataSize")]
    [Description("Size of the current chunk in bytes.")]
    public int EventDataSize { get; set; }

    [JsonPropertyName("totalSize")]
    [Description("Total bytes streamed so far.")]
    public long TotalSize { get; set; }

    [JsonPropertyName("sampleRate")]
    [Description("Audio sample rate in Hz.")]
    public int SampleRate { get; set; }

    [JsonPropertyName("channels")]
    [Description("Number of channels in the PCM stream.")]
    public int Channels { get; set; }

    [JsonPropertyName("encoding")]
    [Description("PCM encoding type, for example pcm_16bit.")]
    public string Encoding { get; set; } = "pcm_16bit";
}
