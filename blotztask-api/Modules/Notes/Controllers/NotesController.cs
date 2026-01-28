using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using BlotzTask.Modules.Notes.Domain;
using BlotzTask.Modules.Notes.DTOs;
using BlotzTask.Modules.Notes.Queries;
using BlotzTask.Modules.Notes.Commands;

namespace BlotzTask.Modules.Notes;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class NoteController
(
  CreateNoteCommandHandler createNoteCommandHandler,
  GetNotesQueryHandler GetNotesQueryHandler,
  UpdateNoteCommandHandler updateNoteCommandHandler,
  DeleteNoteCommandHandler deleteNoteCommandHandler
) : ControllerBase
{
  [HttpPost]
  public async Task<NoteDto> CreateNote([FromBody] CreateNoteCommand request, CancellationToken ct)
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
  [HttpPut]
  public async Task<NoteDto> UpdateNote(Guid id, [FromBody] UpdateNoteCommand request, CancellationToken ct)
  {
    if (!HttpContext.Items.TryGetValue("UserId", out var userIdObj) || userIdObj is not Guid userId)
      throw new UnauthorizedAccessException("Counld not find valid user id from Http Context");
    var command = new UpdateNoteCommand
    {
      NoteId = id,
      UserId = userId,
      Text = request.Text
    };
    return await updateNoteCommandHandler.Handle(command, ct);
  }
  [HttpDelete("{id:guid}")]
  public async Task<IActionResult> DeleteNote(Guid id, CancellationToken ct)
  {
    if (!HttpContext.Items.TryGetValue("UserId", out var userIdObj) || userIdObj is not Guid userId)
      throw new UnauthorizedAccessException("Counld not found valid user id from Http Context");
    var command = new DeleteNoteCommand
    {
      NoteId = id,
      UserId = userId
    };
    await deleteNoteCommandHandler.Handle(command, ct);
    return NoContent();

  }
}