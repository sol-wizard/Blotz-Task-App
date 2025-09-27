using BlotzTask.Modules.Tasks.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BlotzTask.Infrastructure.Data.Configurations;

public class DeletedTaskItemConfiguration : IEntityTypeConfiguration<DeletedTaskItem>
{
    public void Configure(EntityTypeBuilder<DeletedTaskItem> builder)
    {
        builder.ConfigureTaskTime();
    }
}