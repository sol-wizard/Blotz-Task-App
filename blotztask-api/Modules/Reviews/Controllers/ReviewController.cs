using BlotzTask.Modules.Reviews.Commands;
using BlotzTask.Modules.Reviews.Dtos;
using BlotzTask.Modules.Reviews.Queries;
using BlotzTask.Shared.Controllers;
using Microsoft.AspNetCore.Mvc;

namespace BlotzTask.Modules.Reviews.Controllers;

// Timezone handling:
//  Now   - the client sends its IANA timeZoneId per request; ReviewTimeZone.Resolve maps it
//          (valid -> use, missing -> UTC, invalid -> 400) and we snap the anchorDate to local bounds.
//          e.g. Sydney user opens the weekly review: anchorDate=2026-06-11 + timeZoneId=Australia/Sydney
//          -> snapped to Mon 2026-06-08 local -> queried as a UTC range.
//  Later - store TimeZoneId on the user (PBI), so review resolution becomes
//          saved timezone -> request fallback -> reject.
[Route("/api/[controller]")]
public class ReviewController(
    GetReviewQueryHandler getReviewQueryHandler,
    GenerateReviewCommandHandler generateReviewCommandHandler,
    ILogger<ReviewController> logger) : AuthorizedControllerBase
{
    [HttpGet]
    public async Task<ReviewReportDto> GetReview(
        [FromQuery] GetReviewRequest request,
        CancellationToken ct)
    {
        var userId = UserId;

        logger.LogInformation(
            "GetReview for user {UserId} ({PeriodType}, anchor {AnchorDate})",
            userId, request.PeriodType, request.AnchorDate);

        return await getReviewQueryHandler.Handle(
            new GetReviewQuery
            {
                UserId = userId,
                PeriodType = request.PeriodType,
                AnchorDate = request.AnchorDate,
                TimeZoneId = request.TimeZoneId,
            },
            ct);
    }

    // Generation is user-triggered by design for now — a scheduled backend
    // trigger was considered and deliberately deferred.
    [HttpPost("generate")]
    public async Task<ReviewReportDto> Generate(
        [FromBody] GenerateReviewRequest request,
        CancellationToken ct)
    {
        var userId = UserId;

        logger.LogInformation(
            "Generate review (manual) for user {UserId} ({PeriodType}, anchor {AnchorDate})",
            userId, request.PeriodType, request.AnchorDate);

        return await generateReviewCommandHandler.Handle(
            new GenerateReviewCommand
            {
                UserId = userId,
                PeriodType = request.PeriodType,
                AnchorDate = request.AnchorDate,
                TimeZoneId = request.TimeZoneId,
            },
            ct);
    }
}
