using BlotzTask.Modules.Tasks.Domain.Entities;
using Microsoft.AspNetCore.Identity;

namespace BlotzTask.Modules.Users.Domain;
public class User : IdentityUser
{
  public string FirstName { get; set; }
  public string LastName { get; set; }
  public ICollection<TaskItem> TaskItems { get; set; }
}
