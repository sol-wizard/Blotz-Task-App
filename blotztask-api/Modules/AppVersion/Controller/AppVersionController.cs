using BlotzTask.Modules.AppVersion.Dtos;
using BlotzTask.Modules.AppVersion.Options;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace BlotzTask.Modules.AppVersion.Controller;

[AllowAnonymous]
[ApiController]
[Route("api/app-version")]
public sealed class AppVersionController(IOptions<AppVersionOptions> options) : ControllerBase
{
    [HttpGet]
    public ActionResult<AppVersionResponse> Get()
    {
        var option = options.Value;
        return Ok(new AppVersionResponse(
            Ios: Map(option.Ios),
            Android: Map(option.Android)
        ));
    }

    private static PlatformVersionPolicyResponse Map(PlatformVersionPolicy p) =>
        new(p.LatestVersion, p.MinimumSupportedVersion, p.StoreUrl);
}
