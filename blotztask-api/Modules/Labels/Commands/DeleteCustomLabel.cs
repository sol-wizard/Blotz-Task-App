using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Labels.Commands;
using BlotzTask.Modules.Labels.Domain;
using BlotzTask.Modules.Labels.Enums;
using Microsoft.AspNetCore.Http.HttpResults;
using System.ComponentModel.DataAnnotations;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Mvc;
using BlotzTask.Shared.Exceptions;

namespace BlotzTask.Modules.Labels.Commands
{
    public class DeleteCustomLabelCommand
    {
        [Required]
        public required int LabelId { get; set; }
        [Required]
        public required Guid UserId { get; set; }
    }
    
    public class DeleteCustomLabelCommandHandler(BlotzTaskDbContext _blotzTaskDbContext,ILogger<DeleteCustomLabelCommandHandler> logger)
    {

        public async Task<string> Handle(DeleteCustomLabelCommand command, CancellationToken ct)
        {
            var label = await _blotzTaskDbContext.Labels
                .FirstOrDefaultAsync(l => l.LabelId == command.LabelId
                                   && l.Scope == LabelScope.Custom
                                   && l.UserId == command.UserId, ct);
            
            if (label == null)
                throw new NotFoundException("Label not found or no permission to delete.");
            var taskUsingLabel = await _blotzTaskDbContext.TaskItems
                .Where(l => l.LabelId == label.LabelId)
                .ToListAsync(ct);
            foreach (var task in taskUsingLabel)
            {
                task.LabelId = null;

            }

            _blotzTaskDbContext.Labels.Remove(label);
            await _blotzTaskDbContext.SaveChangesAsync(ct);
            logger.LogInformation("Delete label {id}:{labelName}",label.LabelId,label.Name);
            return $"Label {command.LabelId} deleted successfully.";
                
            
        
        }


    }

}
