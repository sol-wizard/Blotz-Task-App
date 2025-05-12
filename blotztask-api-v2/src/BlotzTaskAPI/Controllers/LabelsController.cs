using BlotzTask.Application.Labels.Queries.GetLabels;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BlotzTaskAPI.Controllers;

[ApiController] 
[Route("api/[controller]")]
public class LabelsController : ControllerBase
{
    private readonly IMediator _mediator;

    public LabelsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var result = await _mediator.Send(new GetLabelsQuery());
        return Ok(result);
    }
}