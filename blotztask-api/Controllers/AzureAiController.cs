using BlotzTask.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BlotzTask.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AzureAiController : ControllerBase
    {
        private readonly AzureOpenAIService _aiService;

        public AzureAiController(AzureOpenAIService aiService)
        {
            _aiService = aiService;
        }

        [HttpPost("generate")]
        public async Task<IActionResult> Generate([FromBody] PromptRequest request)
        {
            if (string.IsNullOrWhiteSpace(request?.Prompt))
            {
                return BadRequest("Prompt cannot be empty.");
            }

            var response = await _aiService.GenerateResponseAsync(request.Prompt);
            return Ok(new { Response = response });
        }
    }
}