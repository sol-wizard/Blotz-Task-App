using BlotzTask.Domain.Entities;
using Microsoft.AspNetCore.Identity;

namespace BlotzTask.Infrastructure.Identity;

public class ApplicationUser : IdentityUser
{
  public string FirstName { get; set; }
  public string LastName { get; set; }
  public ICollection<User> Users { get; set; } = new List<User>();
}
