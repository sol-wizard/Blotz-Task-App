using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Labels.Commands;
using BlotzTask.Modules.Labels.Domain;
using BlotzTask.Modules.Labels.Enums;
using Microsoft.AspNetCore.Http.HttpResults;
using System.ComponentModel.DataAnnotations;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Mvc;

namespace BlotzTask.Modules.Labels.Commands
{
    public class DeleteCustomLabelCommand
    {
        [Required]
        public int LabelId { get; set; }
        [Required]
        public string Name { get; set; }
        public LabelScope Scope { get; set; }

        public Guid? UserId { get; set; }
    }
    public class DeleteCustomLabelResult
    {
        public string Message { get; set; } = string.Empty;
    }
    public class DeleteCustomLabelCommandHandler(BlotzTaskDbContext _blotzTaskDbContext,ILogger<DeleteCustomLabelCommandHandler> logger)
    {

        public async Task<DeleteCustomLabelResult> Handle(DeleteCustomLabelCommand command, CancellationToken ct)
        {
            var label = await _blotzTaskDbContext.Labels
                .FirstOrDefaultAsync(l => l.LabelId == command.LabelId
                                   && l.Scope == LabelScope.Custom
                                   && l.UserId == command.UserId, ct);
            logger.LogInformation("Delete {scope} label {id}", command.Scope, command.LabelId);
            if (label == null)
                throw new Exception("Label not found or no permission to delete.");
            var taskUsingLabel = await _blotzTaskDbContext.TaskItems
                .Where(l => l.LabelId == label.LabelId)
                .ToListAsync(ct);
            foreach (var task in taskUsingLabel)
            {
                task.LabelId = null;

            }

            _blotzTaskDbContext.Labels.Remove(label);
            await _blotzTaskDbContext.SaveChangesAsync(ct);
            return new DeleteCustomLabelResult
            {
                Message = $"Label deleted.{taskUsingLabel.Count} tasks has updated to 'No Label'"
            };
                
            
        
        }


    }

}
