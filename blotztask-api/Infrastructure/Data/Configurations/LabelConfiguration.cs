using BlotzTask.Modules.Labels.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BlotzTask.Infrastructure.Data.Configurations;

public class LabelConfiguration : IEntityTypeConfiguration<Label>
{
    public void Configure(EntityTypeBuilder<Label> builder)
    {
        builder.HasOne(l => l.User)
            .WithMany()
            .HasForeignKey(l => l.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Property(l => l.Scope)
            .HasConversion<string>();

        builder.ToTable("Labels", t =>
        {
            t.HasCheckConstraint("CK_Label_Scope_User",
                "(Scope = 'Global' AND UserId IS NULL) OR (Scope = 'Custom' AND UserId IS NOT NULL)");
        });
    }
}
