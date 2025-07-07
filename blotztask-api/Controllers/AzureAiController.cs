using BlotzTask.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BlotzTask.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class AzureAiController : ControllerBase
    {
        private readonly TaskGenerationAIService _aiService;

        public AzureAiController(TaskGenerationAIService aiService)
        {
            _aiService = aiService;
        }

        [HttpPost("generate")]
        public async Task<IActionResult> Generate([FromBody] PromptRequest request, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(request?.Prompt))
            {
                return BadRequest("Prompt cannot be empty.");
            }

            var response = await _aiService.GenerateResponseAsync(request.Prompt, request.TimeZoneId, cancellationToken);
            return Ok(new { Response = response });
        }
       
    }
}