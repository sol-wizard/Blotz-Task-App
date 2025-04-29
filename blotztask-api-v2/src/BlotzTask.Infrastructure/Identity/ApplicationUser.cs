using BlotzTask.Domain.Entities;
using Microsoft.AspNetCore.Identity;

namespace BlotzTask.Infrastructure.Identity;

public class ApplicationUser : IdentityUser
{
  public required string FirstName { get; set; }
  public required string LastName { get; set; }
  public ICollection<User> Users { get; set; } = new List<User>();
}
