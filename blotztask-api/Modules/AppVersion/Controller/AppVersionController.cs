using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using BlotzTask.Modules.AppVersion.Options;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace BlotzTask.Modules.AppVersion.Controller;

[AllowAnonymous]
[ApiController]
[Route("api/app-version")]
public sealed class AppVersionController : ControllerBase
{
    private readonly AppVersionOptions _options;

    public AppVersionController(IOptions<AppVersionOptions> options)
    {
        _options = options.Value;
    }
    
    [HttpGet]
    public ActionResult<AppVersionOptions> Get()
    {
        return Ok(_options);
    }
        
}
