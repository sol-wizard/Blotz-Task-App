using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BlotzTask.Infrastructure.Data.Configurations;

public static class TaskTimeConstraintsConfiguration
{
    public static void ConfigureTaskTime<TEntity>(this EntityTypeBuilder<TEntity> builder)
        where TEntity : class
    {
        var tableName = builder.Metadata.GetTableName();

        builder.ToTable(t =>
        {
            t.HasCheckConstraint($"CK_{tableName}_TimeType_Valid",
                "([TimeType] IN (0,1) AND ([StartTime] IS NOT NULL AND [EndTime] IS NOT NULL)) OR ([StartTime] IS NULL AND [EndTime] IS NULL)");
            t.HasCheckConstraint($"CK_{tableName}_SingleTimeValidation", "([TimeType] <> 0) OR ([StartTime] = [EndTime])");
            t.HasCheckConstraint($"CK_{tableName}_TimeRangeValidation",
                "([StartTime] IS NULL AND [EndTime] IS NULL) OR " +
                "([StartTime] IS NOT NULL AND [EndTime] IS NOT NULL)");
        });
    }
}

