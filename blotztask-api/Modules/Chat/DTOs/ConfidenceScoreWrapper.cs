using System.Text.Json.Serialization;
namespace BlotzTask.Models.GoalToTask
{
    public class ConfidenceScoreWrapper
    {

        [JsonPropertyName("confidenceScore")]
        public double ConfidenceScore { get; set; }
    }
    

}