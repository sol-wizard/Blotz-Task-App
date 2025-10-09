using System.Diagnostics;
using OpenTelemetry;

namespace BlotzTask.Modules.ChatTaskGenerator.Services;

public sealed class SpanDebugProcessor : BaseProcessor<Activity>
{
    public override void OnEnd(Activity activity)
    {
        Console.WriteLine("=== Span End ===");
        Console.WriteLine($"Name: {activity.DisplayName}");
        Console.WriteLine($"Status: {activity.Status}  (Desc: {activity.StatusDescription})");
        Console.WriteLine($"Tags:   {activity.Tags}");
        Console.WriteLine($"Events: {activity.Events.Count()}");

        foreach (var ev in activity.Events.Take(3))
        {
            Console.WriteLine($"  Event: {ev.Name}");
            foreach (var tag in ev.Tags)
                Console.WriteLine($"    {tag.Key}: {tag.Value}");
        }
    }
}