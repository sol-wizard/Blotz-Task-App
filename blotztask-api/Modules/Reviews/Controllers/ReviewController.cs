using BlotzTask.Modules.Reviews.Commands;
using BlotzTask.Modules.Reviews.Dtos;
using BlotzTask.Modules.Reviews.Queries;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BlotzTask.Modules.Reviews.Controllers;

// Timezone handling:
//  ReviewTimeZone.Resolve prefers the user's stored timezone (AppUser.Timezone), falls back to
//  the request's IANA timeZoneId when the user has none stored, and rejects (400) when neither
//  is available -- never silently defaults to UTC.
//  e.g. Sydney user opens the weekly review: anchorDate=2026-06-11 + stored/request
//  timeZoneId=Australia/Sydney -> snapped to Mon 2026-06-08 local -> queried as a UTC range.
[ApiController]
[Route("/api/[controller]")]
[Authorize]
public class ReviewController(
    GetReviewQueryHandler getReviewQueryHandler,
    GenerateReviewCommandHandler generateReviewCommandHandler,
    ILogger<ReviewController> logger) : ControllerBase
{
    [HttpGet]
    public async Task<ReviewReportDto> GetReview(
        [FromQuery] GetReviewRequest request,
        CancellationToken ct)
    {
        if (!HttpContext.Items.TryGetValue("UserId", out var userIdObj) || userIdObj is not Guid userId)
            throw new UnauthorizedAccessException("Could not find valid user id from Http Context");

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
        if (!HttpContext.Items.TryGetValue("UserId", out var userIdObj) || userIdObj is not Guid userId)
            throw new UnauthorizedAccessException("Could not find valid user id from Http Context");

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
