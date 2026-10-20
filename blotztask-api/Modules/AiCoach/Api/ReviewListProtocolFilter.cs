using System.Text.Json;
using System.Text.Json.Nodes;
using BlotzTask.Modules.AiCoach.Domain.Proposals;
using BlotzTask.Modules.AiCoach.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.Extensions.Options;

namespace BlotzTask.Modules.AiCoach.Api;

/// <summary>Protocol 6 is opt-in; task-only clients never receive or mutate mixed lists.</summary>
public sealed class ReviewListProtocolFilter(IConversationStore store, IOptions<JsonOptions> jsonOptions)
    : IAsyncActionFilter
{
    public const string HeaderName = "X-Ai-Coach-Protocol";

    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var header = context.HttpContext.Request.Headers[HeaderName].ToString();
        if (header is not ("" or "5" or "6"))
        {
            context.Result = new BadRequestObjectResult(new { errorCode = "UnsupportedProtocolVersion" });
            return;
        }
        var review = header == "6";
        if (!review && !HttpMethods.IsGet(context.HttpContext.Request.Method)
            && context.ActionArguments.TryGetValue("conversationId", out var conversationValue)
            && conversationValue is Guid conversationId)
        {
            var conversation = await store.FindAsync(conversationId, context.HttpContext.RequestAborted);
            var owned = conversation is not null && context.HttpContext.Items["UserId"] is Guid userId
                && conversation.UserId == userId;
            var draftId = context.ActionArguments.TryGetValue("draftId", out var value) ? value as Guid? : null;
            if (owned && conversation!.Drafts.Any(draft => draft.IsReviewList && (draftId.HasValue
                ? draft.Id == draftId.Value
                : draft.Status is ProposalSetStatus.Pending or ProposalSetStatus.Processing)))
            {
                context.Result = new ConflictObjectResult(new { errorCode = "ReviewListRequiresProtocol6" });
                return;
            }
        }
        var executed = await next();
        if (executed.Result is not ObjectResult { Value: { } payload } result) return;
        var node = JsonSerializer.SerializeToNode(payload, payload.GetType(), jsonOptions.Value.JsonSerializerOptions);
        if (node is null) return;
        Project(node, review);
        result.Value = node;
    }

    internal static void Project(JsonNode node, bool review)
    {
        if (node is JsonObject obj)
        {
            if (obj.ContainsKey("protocolVersion")) obj["protocolVersion"] = review ? 6 : 5;
            if (!review)
            {
                obj.Remove("pendingList");
                foreach (var name in new[] { "artifacts", "draftSnapshot" })
                    if (obj[name] is JsonArray artifacts)
                        for (var index = artifacts.Count - 1; index >= 0; index--)
                            if (artifacts[index]?["isReviewList"]?.GetValue<bool>() == true
                                || artifacts[index]?["payload"]?["items"] is JsonArray items
                                && items.Any(item => item?["kind"]?.GetValue<string>() == "note"))
                                artifacts.RemoveAt(index);
                obj.Remove("isReviewList");
                obj.Remove("canConfirm");
                obj.Remove("validationErrors");
                if (obj.ContainsKey("itemId"))
                {
                    obj.Remove("kind");
                    obj.Remove("persistedNoteId");
                    obj.Remove("suggestedFields");
                }
            }
            foreach (var property in obj.ToArray())
                if (property.Value is not null) Project(property.Value, review);
        }
        else if (node is JsonArray array)
            foreach (var child in array)
                if (child is not null) Project(child, review);
    }
}
