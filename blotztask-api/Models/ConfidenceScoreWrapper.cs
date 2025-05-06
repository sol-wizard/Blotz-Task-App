using System.Text.Json.Serialization;
namespace BlotzTask.Models
{
    public class ConfidenceScoreWrapper
    {

        [JsonPropertyName("confidenceScore")]
        public double ConfidenceScore { get; set; }
    }
    

}