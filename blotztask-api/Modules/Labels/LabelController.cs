﻿using BlotzTask.Modules.Labels.DTOs;
using BlotzTask.Modules.Labels.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BlotzTask.Modules.Labels;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class LabelController : ControllerBase
{
    private readonly ILabelService _labelService;

    public LabelController(ILabelService labelService)
    {
        _labelService = labelService;
    }

    [HttpGet]
    [Tags("MigratedToCleanArchitecture")]
    public async Task<IActionResult> GetAllLabels()
    {
        return Ok(await _labelService.GetAllLabelsAsync());
    }
        
    [HttpGet("{id}")]
    public async Task<IActionResult> GetLabelById(int id)
    {
        return Ok(await _labelService.GetLabelById(id)); 
    }

    [HttpPost]
    public async Task<IActionResult> AddLabel([FromBody] AddLabelDto addLabel)
    {
        return Ok(await _labelService.AddLabelAsync(addLabel));
    }
}