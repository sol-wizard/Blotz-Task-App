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
            t.HasCheckConstraint($"CK_{tableName}_Time_Presence",
                "(" +
                "  ([TimeType] IS NULL AND [StartTime] IS NULL AND [EndTime] IS NULL)" +
                "   OR" +
                "  ([TimeType] IN (0,1) AND [StartTime] IS NOT NULL AND [EndTime] IS NOT NULL)" +
                ")");

            t.HasCheckConstraint($"CK_{tableName}_SingleTime_Equals",
                "([TimeType] IS NULL) OR ([TimeType] <> 0) OR ([StartTime] = [EndTime])");

            t.HasCheckConstraint($"CK_{tableName}_Start_Before_Or_Equal_End",
                "([StartTime] IS NULL AND [EndTime] IS NULL) OR ([StartTime] <= [EndTime])");
        });
    }
}

