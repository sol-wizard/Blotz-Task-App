using BlotzTask.Modules.Notes.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BlotzTask.Infrastructure.Data.Configurations;

public class NoteConfiguration : IEntityTypeConfiguration<Note>
{
       public void Configure(EntityTypeBuilder<Note> builder)
       {
              builder.ToTable("Notes");
              builder.HasKey(n => n.Id);
              builder.Property(n => n.Text)
                     .IsRequired()
                     .HasMaxLength(2000);
              builder.Property(n => n.CreatedAt)
                     .IsRequired();
              builder.Property(n => n.UpdatedAt)
                     .IsRequired();
              builder.Property(n => n.UserId)
                     .IsRequired();
              builder.HasIndex(n => n.UserId);
              builder.HasOne(n => n.User)
                     .WithMany()
                     .HasForeignKey(n => n.UserId)
                     .OnDelete(DeleteBehavior.Cascade);




       }
}


