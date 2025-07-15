using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Labels.Domain;
using BlotzTask.Modules.Labels.DTOs;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Modules.Labels.Services;

public interface ILabelService
{
    public Task<List<LabelDto>> GetAllLabelsAsync();
    public Task<Label> GetLabelById(int id);
    public Task<string> AddLabelAsync(AddLabelDto addLabel);
}

public class LabelService : ILabelService
{
    private readonly BlotzTaskDbContext _dbContext;

    public LabelService(BlotzTaskDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<List<LabelDto>> GetAllLabelsAsync()
    {
        try
        {
            return await _dbContext.Labels
                .Select(label => new LabelDto
                     {
                         LabelId = label.LabelId,
                         Name = label.Name,
                         Color = label.Color,
                         Description = label.Description
                     }).ToListAsync();
        }
        catch (Exception ex)
        {
            //TODO: Add some error log throw (havent create PBI)
            throw;
        }
    }
    
    public async Task<Label> GetLabelById(int id)
    {
        return await _dbContext.Labels.FindAsync(id);
    }

    public async Task<string> AddLabelAsync(AddLabelDto addLabel)
    {
        var addlabel = new Label
        {
            Name = addLabel.Name,
            Color = addLabel.Color,
            Description = addLabel.Description
        };

        _dbContext.Labels.Add(addlabel);
        await _dbContext.SaveChangesAsync();

        return addLabel.Name;
    }
}
