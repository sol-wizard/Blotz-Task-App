using BlotzTask.Modules.Tasks.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BlotzTask.Infrastructure.Data.Configurations;

public class DeletedTaskItemConfiguration : IEntityTypeConfiguration<DeletedTaskItem>
{
    public void Configure(EntityTypeBuilder<DeletedTaskItem> builder)
    {
        builder.ToTable(t =>
        {
            t.HasCheckConstraint($"CK_DeletedTaskItem_Time_Valid",
                "(" +
                "  ([TimeType] IS NULL AND [StartTime] IS NULL AND [EndTime] IS NULL)" +
                "   OR" +
                "  ([TimeType] IS NOT NULL AND [StartTime] IS NOT NULL AND [EndTime] IS NOT NULL)" +
                ")");

            t.HasCheckConstraint($"CK_DeletedTaskItem_SingleTime_Equals",
                "([TimeType] IS NULL) OR ([TimeType] <> 0) OR ([StartTime] = [EndTime])");

            t.HasCheckConstraint($"CK_DeletedTaskItem_Start_Before_Or_Equal_End",
                "([StartTime] IS NULL AND [EndTime] IS NULL) OR ([StartTime] <= [EndTime])");
        });
    }
}