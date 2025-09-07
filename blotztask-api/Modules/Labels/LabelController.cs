using BlotzTask.Modules.Labels.Commands;
using BlotzTask.Modules.Labels.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using AddLabelDto = BlotzTask.Modules.Labels.DTOs.AddLabelDto;

namespace BlotzTask.Modules.Labels;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class LabelController(ILabelService _labelService, AddLabelCommandHandler addlabelCommandHandler) : ControllerBase
{

    [HttpGet]
    public async Task<IActionResult> GetAllLabels()
    {
        return Ok(await _labelService.GetAllLabelsAsync());
    }
        
    [HttpGet("{id}")]
    public async Task<IActionResult> GetLabelById(int id)
    {
        return Ok(await _labelService.GetLabelById(id)); 
    }



    [HttpPost]
    [Obsolete("This endpoint is not in used")]
    public async Task<IActionResult> AddLabel([FromBody] AddLabelDto addLabels, CancellationToken ct)
    {

        var name = addLabels.Name;
        var command = new AddLabelCommand
        {
            Name = name,
            Color = addLabels.Color,
            Description = addLabels.Description,
        };
        var result = await addlabelCommandHandler.Handle(command, ct);
        if (result == null)
        {
            throw new InvalidOperationException($"Failed to add label {name}.");

        }

        return Ok(result);
        
    }
}