using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Labels.Domain;
using BlotzTask.Modules.Labels.DTOs;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Modules.Labels.Services;

public interface ILabelService
{

    public Task<Label> GetLabelById(int id);

}

public class LabelService : ILabelService
{
    private readonly BlotzTaskDbContext _dbContext;

    public LabelService(BlotzTaskDbContext dbContext)
    {
        _dbContext = dbContext;
    }


    
    public async Task<Label> GetLabelById(int id)
    {
        return await _dbContext.Labels.FindAsync(id);
    }


}
