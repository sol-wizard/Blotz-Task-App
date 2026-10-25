using BlotzTask.Modules.AiCoach.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BlotzTask.Infrastructure.Data.Configurations;

public sealed class AiCoachBudgetChargeConfiguration : IEntityTypeConfiguration<AiCoachBudgetCharge>
{
    public void Configure(EntityTypeBuilder<AiCoachBudgetCharge> builder)
    {
        builder.ToTable("AiCoachBudgetCharge");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Environment).HasMaxLength(32).IsRequired();
        builder.Property(x => x.Model).HasMaxLength(128).IsRequired();
        builder.Property(x => x.ChargedUsd).HasPrecision(20, 10);
        builder.HasIndex(x => new { x.Environment, x.BudgetDate });
    }
}
