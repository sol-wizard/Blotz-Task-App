using BlotzTask.Domain.Entities;
using BlotzTask.Infrastructure.Identity;
using BlotzTask.Application.Common.Interfaces;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Infrastructure.Data;


public class ApplicationDbContext : IdentityDbContext<ApplicationUser>, IApplicationDbContext
{
    public ApplicationDbContext(DbContextOptions options) : base(options) { }

    public DbSet<User> Users { get; set; }
    public DbSet<TaskItem> TaskItems { get; set; }
    public DbSet<Label> Labels { get; set; }
    public DbSet<DeletedTaskItem> DeletedTaskItems { get; set; }

    public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        return await base.SaveChangesAsync(cancellationToken);
    }
    
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        
        modelBuilder.Entity<User>()
            .HasOne<ApplicationUser>()
            .WithOne()
            .HasForeignKey<User>(u => u.IdentityUserId)
            .IsRequired();
        
        modelBuilder.Entity<Label>().HasData(
            new Label
            {
                LabelId = 6,
                Name = "Work",
                Color = "#7758FF",
                Description = "Work related tasks"
            },
            new Label
            {
                LabelId = 7,
                Name = "Personal",
                Color = "#FFDE23",
                Description = "Personal tasks"
            },
            new Label
            {
                LabelId = 8,
                Name = "Academic",
                Color = "#FF4747",
                Description = "Academic tasks"
            },
            new Label
            {
                LabelId = 9,
                Name = "Others",
                Color = "#09F1D6",
                Description = "Other tasks"
            }
        );
    }
}
