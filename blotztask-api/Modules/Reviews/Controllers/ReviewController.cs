using BlotzTask.Modules.Reviews.Commands;
using BlotzTask.Modules.Reviews.Dtos;
using BlotzTask.Modules.Reviews.Queries;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BlotzTask.Modules.Reviews.Controllers;

[ApiController]
[Route("/api/[controller]")]
[Authorize]
public class ReviewController(
    GetReviewQueryHandler getReviewQueryHandler,
    GenerateReviewCommandHandler generateReviewCommandHandler,
    ILogger<ReviewController> logger) : ControllerBase
{
    [HttpGet]
    public async Task<ReviewReportDto?> GetReview(
        [FromQuery] GetReviewRequest request,
        CancellationToken ct)
    {
        if (!HttpContext.Items.TryGetValue("UserId", out var userIdObj) || userIdObj is not Guid userId)
            throw new UnauthorizedAccessException("Could not find valid user id from Http Context");

        logger.LogInformation(
            "GetReview for user {UserId} ({Year}-{Month:D2})",
            userId, request.Year, request.Month);

        return await getReviewQueryHandler.Handle(
            new GetReviewQuery
            {
                UserId = userId,
                Year = request.Year,
                Month = request.Month,
            },
            ct);
    }

    // Generation is user-triggered by design for now — a scheduled backend
    // trigger was considered and deliberately deferred.
    [HttpPost("generate")]
    public async Task<ReviewReportDto> Generate(
        [FromQuery] GenerateReviewRequest request,
        CancellationToken ct)
    {
        if (!HttpContext.Items.TryGetValue("UserId", out var userIdObj) || userIdObj is not Guid userId)
            throw new UnauthorizedAccessException("Could not find valid user id from Http Context");

        logger.LogInformation(
            "Generate monthly review (manual) for user {UserId} ({Year}-{Month:D2})",
            userId, request.Year, request.Month);

        return await generateReviewCommandHandler.Handle(
            new GenerateReviewCommand
            {
                UserId = userId,
                Year = request.Year,
                Month = request.Month,
            },
            ct);
    }
}
