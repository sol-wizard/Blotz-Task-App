using BlotzTask.Modules.Onboarding.Commands;
using BlotzTask.Modules.Onboarding.Contracts;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BlotzTask.Modules.Onboarding;

[ApiController]
[Authorize]
[Route("/api/onboarding")]
public class OnboardingController(
    GetOnboardingStateQueryHandler getOnboardingStateQueryHandler,
    UpdateOnboardingStepCommandHandler updateOnboardingStepCommandHandler,
    ILogger<OnboardingController> logger
) : ControllerBase
{
    

    [HttpGet]
    public async Task<OnboardingStateDto> Get(CancellationToken ct)
    {
        if (!HttpContext.Items.TryGetValue("UserId", out var userIdObj) || userIdObj is not Guid userId)
            throw new UnauthorizedAccessException("Could not find valid user id from Http Context");

        
        return await getOnboardingStateQueryHandler.Handle(new GetOnboardingStateQuery(userId), ct);
    }

    [HttpPost("advance")]
    public async Task<IActionResult> Advance([FromBody] AdvanceOnboardingRequest request, CancellationToken ct)
    {
        if (!HttpContext.Items.TryGetValue("UserId", out var userIdObj) || userIdObj is not Guid userId)
            throw new UnauthorizedAccessException("Could not find valid user id from Http Context");

        try
        {
            await updateOnboardingStepCommandHandler.Handle(new UpdateOnboardingStepCommand(userId, request.CompletedStep), ct);
            return NoContent(); 
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }


}