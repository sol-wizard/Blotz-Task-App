using BlotzTask.Application.Common.Exceptions;
using BlotzTaskAPI.Models;

namespace BlotzTaskAPI.Middleware;

public class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;

    public ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
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
            _logger.LogError(ex, "Not found error: {Message}", ex.Message);

            context.Response.StatusCode = StatusCodes.Status404NotFound; 
            await context.Response.WriteAsJsonAsync(new ApiResponse<object> 
            { 
                Success = false, 
                Message = ex.Message
            });
        }
        
        catch (ForbiddenAccessException ex)
        {
            _logger.LogWarning(ex, "Access denied.");

            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            await context.Response.WriteAsJsonAsync(new ApiResponse<object>
            {
                Success = false,
                Message = ex.Message
            });
        }
        
        catch (Exception ex)
        {
            _logger.LogError(ex, "An unhandled exception occurred: {Message}", ex.Message);

            context.Response.StatusCode = StatusCodes.Status500InternalServerError;
            await context.Response.WriteAsJsonAsync(new ApiResponse<object> 
            { 
                Success = false, 
                Message = "An error occurred while processing your request." 
            });
        }
    }
}