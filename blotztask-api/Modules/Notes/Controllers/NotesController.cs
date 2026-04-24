using BlotzTask.Modules.Notes.Commands;
using BlotzTask.Modules.Notes.DTOs;
using BlotzTask.Modules.Notes.Queries;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BlotzTask.Modules.Notes;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class NotesController(
    CreateNoteCommandHandler createNoteCommandHandler,
    SearchNotesQueryHandler searchNotesQueryHandler,
    UpdateNoteCommandHandler updateNoteCommandHandler,
    DeleteNoteCommandHandler deleteNoteCommandHandler,
    TimeEstimateCommandHandler timeEstimateCommandHandler,
    ConvertNoteToTaskCommandHandler convertNoteToTaskCommandHandler
) : ControllerBase
{
    [HttpPost]
    public async Task<NoteDto> CreateNote([FromBody] NoteRequestDto request, CancellationToken ct)
    {
        if (!HttpContext.Items.TryGetValue("UserId", out var userIdObj) || userIdObj is not Guid userId)
            throw new UnauthorizedAccessException("Could not find valid user id from Http Context");
        var command = new CreateNoteCommand
        {
            UserId = userId,
            Text = request.Text
        };
        return await createNoteCommandHandler.Handle(command, ct);
    }

    [HttpPost("/api/TimeEstimate")]
    public async Task<AITimeEstimationResult?> EstimateNoteTime([FromBody] NoteTimeEstimationDto note,
        CancellationToken ct)
    {
        if (!HttpContext.Items.TryGetValue("UserId", out var userIdObj) || userIdObj is not Guid userId)
            throw new UnauthorizedAccessException("Could not find valid user id from Http Context");

        var command = new NoteTimeEstimationRequest
        {
            UserId = userId,
            Text = note.Text,
            NoteId = note.Id
        };
        return await timeEstimateCommandHandler.Handle(command, ct);
    }

    // [HttpGet]
    // public async Task<List<NoteDto>> SearchNote([FromQuery] string? query, CancellationToken ct)
    // {
    //     if (!HttpContext.Items.TryGetValue("UserId", out var userIdObj) || userIdObj is not Guid userId)
    //         throw new UnauthorizedAccessException("Could not find valid user id from Http Context");
    //     var searchQuery = new SearchNotesQuery { UserId = userId, QueryString = query };
    //     return await searchNotesQueryHandler.Handle(searchQuery, ct);
    // }

    [HttpPut("{id:guid}")]
    public async Task<NoteDto> UpdateNote(Guid id, [FromBody] NoteRequestDto dto, CancellationToken ct)
    {
        if (!HttpContext.Items.TryGetValue("UserId", out var userIdObj) || userIdObj is not Guid userId)
            throw new UnauthorizedAccessException("Could not find valid user id from Http Context");
        var command = new UpdateNoteCommand
        {
            NoteId = id,
            UserId = userId,
            Text = dto.Text
        };
        return await updateNoteCommandHandler.Handle(command, ct);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteNote(Guid id, CancellationToken ct)
    {
        if (!HttpContext.Items.TryGetValue("UserId", out var userIdObj) || userIdObj is not Guid userId)
            throw new UnauthorizedAccessException("Could not find valid user id from Http Context");
        var command = new DeleteNoteCommand
        {
            NoteId = id,
            UserId = userId
        };
        await deleteNoteCommandHandler.Handle(command, ct);
        return NoContent();
    }

    [HttpPost("{id:guid}/convert-to-task")]
    public async Task<IActionResult> ConvertNoteToTask(
        Guid id,
        [FromBody] Commands.ConvertNoteToTaskRequestDto? request,
        CancellationToken ct)
    {
        if (!HttpContext.Items.TryGetValue("UserId", out var userIdObj) || userIdObj is not Guid userId)
            throw new UnauthorizedAccessException("Could not find valid user id from Http Context");
        if (request is null)
            return BadRequest("Request body with StartTime and EndTime is required.");

        var command = new ConvertNoteToTaskCommand
        {
            NoteId = id,
            UserId = userId,
            StartTime = request.StartTime,
            EndTime = request.EndTime
        };

        var newTaskId = await convertNoteToTaskCommandHandler.Handle(command, ct);
        return Ok(new { taskId = newTaskId });
    }
}