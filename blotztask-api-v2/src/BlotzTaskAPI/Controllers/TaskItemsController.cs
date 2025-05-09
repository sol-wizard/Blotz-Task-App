using BlotzTask.Application.Tasks.Commands.CreateTaskItem;
using BlotzTaskAPI.Models;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace BlotzTaskAPI.Controllers;

[ApiController] 
[Route("api/[controller]")]
public class TaskItemsController : ControllerBase
{
    private readonly IMediator _mediator;

    public TaskItemsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    /// <summary>
    /// Create a new task item.
    /// </summary>
    /// <param name="command">The task item details.</param>
    /// <returns>Task ID with success message.</returns>
    [HttpPost]
    [ProducesResponseType(typeof(ApiResponse<int>), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Create([FromBody] CreateTaskItemCommand command)
    {
        var result = await _mediator.Send(command);

        var response = new ApiResponse<string>
        {
            Data = result.Data,
            Message = result.Message,
            Success = result.Success
        };

        return CreatedAtAction(nameof(GetById), new { id = result.Data }, response);
    }
    
    [HttpGet("{id}")]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
    public IActionResult GetById(int id)
    {
        // Placeholder for CreatedAtAction link — implement this later
        return Ok(new { id });
    }
}