using BlotzTask.Modules.AiCoach.Infrastructure;
using Microsoft.Extensions.Options;

namespace BlotzTask.Modules.AiCoach.Ai.ModelGateway;

/// <summary>Immutable selection shared by every call in a turn, including its usage estimate.</summary>
public sealed record AiCoachModelProfile(string Name, string DeploymentId, string Api,
    string? ReasoningEffort, int MaxOutputTokens, int RequestTimeoutSeconds,
    decimal? InputTokenUsdPerMillion, decimal? CachedInputTokenUsdPerMillion, decimal? OutputTokenUsdPerMillion)
{
    public decimal? EstimateUsd(int input, int cached, int output) =>
        InputTokenUsdPerMillion is { } inputRate && OutputTokenUsdPerMillion is { } outputRate
            ? ((input - cached) * inputRate + cached * (CachedInputTokenUsdPerMillion ?? inputRate)
                + output * outputRate) / 1_000_000m
            : null;

    public static AiCoachModelProfile Select(AiCoachModuleOptions options)
    {
        if (string.IsNullOrWhiteSpace(options.DefaultModel))
        {
            if (!string.IsNullOrWhiteSpace(options.DeploymentId))
                return new("legacy", options.DeploymentId, "ChatCompletions", null, options.MaxOutputTokens,
                    options.ModelRequestTimeoutSeconds, Positive(options.InputTokenUsdPerMillion), null,
                    Positive(options.OutputTokenUsdPerMillion));
            throw Invalid("AiCoach requires DefaultModel or a legacy DeploymentId.");
        }
        if (!options.Models.TryGetValue(options.DefaultModel, out var model))
            throw Invalid($"AiCoach:DefaultModel '{options.DefaultModel}' does not name a configured profile.");
        return new(options.DefaultModel, model.DeploymentId, model.Api, model.ReasoningEffort,
            model.MaxOutputTokens, model.RequestTimeoutSeconds, model.InputTokenUsdPerMillion,
            model.CachedInputTokenUsdPerMillion, model.OutputTokenUsdPerMillion);
    }

    public static bool IsValid(AiCoachModuleOptions options)
    {
        if (!string.IsNullOrWhiteSpace(options.DefaultModel) && !options.Models.ContainsKey(options.DefaultModel)) return false;
        foreach (var model in options.Models.Values)
        {
            if (string.IsNullOrWhiteSpace(model.DeploymentId)
                || model.Api is not ("ChatCompletions" or "Responses")
                || model.MaxOutputTokens <= 0 || model.RequestTimeoutSeconds <= 0
                || model.InputTokenUsdPerMillion < 0 || model.CachedInputTokenUsdPerMillion < 0
                || model.OutputTokenUsdPerMillion < 0
                || (model.InputTokenUsdPerMillion.HasValue != model.OutputTokenUsdPerMillion.HasValue)
                || (model.CachedInputTokenUsdPerMillion.HasValue && !model.InputTokenUsdPerMillion.HasValue)
                || (model.ReasoningEffort is not null && (model.Api != "Responses"
                    || model.ReasoningEffort is not ("low" or "medium" or "high" or "xhigh")))
                || (model.DeploymentId.StartsWith("gpt-6.1-sol", StringComparison.OrdinalIgnoreCase)
                    && model.Api != "Responses")) return false;
        }
        return !string.IsNullOrWhiteSpace(options.DefaultModel)
            || (!string.IsNullOrWhiteSpace(options.DeploymentId)
                && !options.DeploymentId.StartsWith("gpt-6.1-sol", StringComparison.OrdinalIgnoreCase));
    }

    private static decimal? Positive(decimal value) => value > 0 ? value : null;
    private static OptionsValidationException Invalid(string message) =>
        new(AiCoachModuleOptions.SectionName, typeof(AiCoachModuleOptions), [message]);
}
