using Microsoft.AspNetCore.Identity;

namespace BlotzTask.Data.Entities;
public class User : IdentityUser
{
  public string FirstName { get; set; }
  public string LastName { get; set; }
  public ICollection<TaskItem> TaskItems { get; set; }
}
