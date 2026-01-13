using System.ComponentModel.DataAnnotations;
using BlotzTask.Shared.Exceptions;
using BlotzTask.Shared.Responses;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Middleware;

public class ErrorHandlingMiddleware
{
    private readonly IWebHostEnvironment _environment;
    private readonly ILogger<ErrorHandlingMiddleware> _logger;
    private readonly RequestDelegate _next;

    public ErrorHandlingMiddleware(
        RequestDelegate next,
        ILogger<ErrorHandlingMiddleware> logger,
        IWebHostEnvironment environment)
    {
        _next = next;
        _logger = logger;
        _environment = environment;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (UnauthorizedAccessException ex)
        {
            var errorMessage = string.IsNullOrWhiteSpace(ex.Message) ? "Unauthorized access." : ex.Message;
            _logger.LogWarning(ex, "Unauthorized access attempt: {Message}", errorMessage);

            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            await context.Response.WriteAsJsonAsync(new ApiResponse<object>
            {
                Success = false,
                Message = errorMessage
            });
        }
        catch (NotFoundException ex)
        {
            _logger.LogWarning(ex, "Not found: {Message}", ex.Message);
            context.Response.StatusCode = StatusCodes.Status404NotFound;
            await context.Response.WriteAsJsonAsync(new ApiResponse<object>
            {
                Success = false,
                Message = ex.Message
            });
        }
        catch (ValidationException ex)
        {
            _logger.LogWarning(ex, "Validation error: {Message}", ex.Message);
            context.Response.StatusCode = StatusCodes.Status400BadRequest;
            await context.Response.WriteAsJsonAsync(new ApiResponse<object>
            {
                Success = false,
                Message = ex.Message
            });
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "Bad request: {Message}", ex.Message);
            context.Response.StatusCode = StatusCodes.Status400BadRequest;
            await context.Response.WriteAsJsonAsync(new ApiResponse<object>
            {
                Success = false,
                Message = ex.Message
            });
        }
        catch (DbUpdateException ex)
        {
            // Avoid leaking DB details; treat as conflict unless the caller explicitly handles it.
            _logger.LogError(ex, "Database update error");
            context.Response.StatusCode = StatusCodes.Status409Conflict;
            await context.Response.WriteAsJsonAsync(new ApiResponse<object>
            {
                Success = false,
                Message = "A database conflict occurred."
            });
        }
        catch (Exception ex)
        {
            if (context.Response.HasStarted)
            {
                // Too late to write a response body. Let the server handle it (and still log).
                _logger.LogError(ex, "Unhandled exception after response started");
                throw;
            }

            _logger.LogError(ex, "Unhandled exception. TraceIdentifier: {TraceIdentifier}", context.TraceIdentifier);
            context.Response.StatusCode = StatusCodes.Status500InternalServerError;

            var message = _environment.IsDevelopment()
                ? ex.Message
                : "An unexpected error occurred.";

            await context.Response.WriteAsJsonAsync(new ApiResponse<object>
            {
                Success = false,
                Message = message
            });
        }
    }
}