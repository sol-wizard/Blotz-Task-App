using BlotzTask.Modules.Users.Domain;
using BlotzTask.Modules.Users.DTOs;
using BlotzTask.Shared.Exceptions;
using Microsoft.AspNetCore.Identity;

namespace BlotzTask.Modules.Users.Services;

public interface IUserService
{
    public Task<UserInfoDto> GetCurrentUserInfoAsync(string userId);

    public Task<IdentityResult> RegisterUserAsync(RegisterRequestDto request);
}

public class UserService : IUserService
{
    private readonly UserManager<User> _userManager;

    public UserService(UserManager<User> userManager)
    {
        _userManager = userManager;
    }

    public async Task<UserInfoDto> GetCurrentUserInfoAsync(string userId)
    {
        try
        {
            if (string.IsNullOrEmpty(userId))
            {
                throw new NotFoundException($"User Not Founded");
            }
            
            var user = await _userManager.FindByIdAsync(userId);
            if (user == null)
            {
                throw new NotFoundException($"User Not Founded");
            }

            return new UserInfoDto
            {   
                // Username and Email can be empty in database.
                Username = user.UserName?? string.Empty,
                Firstname = user.FirstName ?? string.Empty,
                Lastname = user.LastName ?? string.Empty,
                Email = user.Email?? string.Empty,
                Message = "Successfully get current user info"
            };
        }
        catch (Exception)
        {
            throw;
        }
    }
    public async Task<IdentityResult> RegisterUserAsync(RegisterRequestDto request)
    {

        var user = new User
        {
            UserName = request.Email,
            Email = request.Email,
            FirstName = request.FirstName,
            LastName = request.LastName
        };

        var result = await _userManager.CreateAsync(user, request.Password);

        return result.Succeeded ? IdentityResult.Success : IdentityResult.Failed(result.Errors.ToArray());
    }
}

