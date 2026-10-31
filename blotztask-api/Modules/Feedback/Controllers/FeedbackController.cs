using System.ComponentModel.DataAnnotations;
using BlotzTask.Modules.Feedback.Commands;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace BlotzTask.Modules.Feedback.Controllers;

[ApiController]
[Route("/api/[controller]")]
[Authorize]
public class FeedbackController(
    SubmitFeedbackCommandHandler submitFeedbackCommandHandler,
    ILogger<FeedbackController> logger) : ControllerBase
{
    [HttpPost]
    [EnableRateLimiting("feedback")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> Submit(
        [FromForm][MaxLength(500)] string text,
        [FromForm] IFormFile? image,
        [FromForm] string? appVersion,
        [FromForm] string? platform,
        [FromForm] string? deviceModel,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(text) || text.Length > 500)
            return BadRequest("Text is required and must be 500 characters or fewer.");

        if (!HttpContext.Items.TryGetValue("UserId", out var userIdObj) || userIdObj is not Guid userId)
            return Unauthorized();

        logger.LogInformation("Feedback submission received, hasImage={HasImage}", image is not null);

        await submitFeedbackCommandHandler.Handle(
            new SubmitFeedbackCommand
            {
                Text = text,
                UserId = userId,
                Image = image,
                AppVersion = appVersion,
                Platform = platform,
                DeviceModel = deviceModel
            }, ct);

        return Ok();
    }
}
