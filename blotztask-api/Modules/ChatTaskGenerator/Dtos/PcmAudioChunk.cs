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

}
