using BlotzTask.Modules.MonthlyReviews.Dtos;
using BlotzTask.Modules.MonthlyReviews.Queries;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BlotzTask.Modules.MonthlyReviews.Controllers;

[ApiController]
[Route("/api/[controller]")]
[Authorize]
public class MonthlyReviewController(
    GetMonthlyReviewQueryHandler getMonthlyReviewQueryHandler,
    ILogger<MonthlyReviewController> logger) : ControllerBase
{
    [HttpGet]
    public async Task<MonthlyReviewDto?> GetMonthlyReview(
        [FromQuery] GetMonthlyReviewRequest request,
        CancellationToken ct)
    {
        if (!HttpContext.Items.TryGetValue("UserId", out var userIdObj) || userIdObj is not Guid userId)
            throw new UnauthorizedAccessException("Could not find valid user id from Http Context");

        logger.LogInformation(
            "GetMonthlyReview for user {UserId} ({Year}-{Month:D2})",
            userId, request.Year, request.Month);

        return await getMonthlyReviewQueryHandler.Handle(
            new GetMonthlyReviewQuery
            {
                UserId = userId,
                Year = request.Year,
                Month = request.Month,
            },
            ct);
    }
}
