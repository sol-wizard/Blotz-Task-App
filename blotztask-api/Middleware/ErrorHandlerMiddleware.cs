using System.Diagnostics;
using BlotzTask.Shared.Exceptions;
using BlotzTask.Shared.Responses;

namespace BlotzTask.Middleware;

public class ErrorHandlingMiddleware
{
    private readonly ILogger<ErrorHandlingMiddleware> _logger;
    private readonly RequestDelegate _next;

    public ErrorHandlingMiddleware(RequestDelegate next, ILogger<ErrorHandlingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var sw = Stopwatch.StartNew();

        _logger.LogInformation(
            "ErrorHandlingMiddleware starting for {Path}",
            context.Request.Path);

        try
        {
            await _next(context);

            sw.Stop();
            _logger.LogInformation(
                "ErrorHandlingMiddleware finished for {Path} in {Elapsed} ms with status code {StatusCode}",
                context.Request.Path,
                sw.ElapsedMilliseconds,
                context.Response.StatusCode);
        }
        catch (UnauthorizedAccessException ex)
        {
            sw.Stop();

            var errorMessage = string.IsNullOrWhiteSpace(ex.Message)
                ? "Unauthorized access."
                : ex.Message;

            _logger.LogWarning(
                ex,
                "Unauthorized access attempt after {Elapsed} ms: {Message}",
                sw.ElapsedMilliseconds,
                errorMessage);

            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            await context.Response.WriteAsJsonAsync(new ApiResponse<object>
            {
                Success = false,
                Message = errorMessage
            });
        }
        catch (NotFoundException ex)
        {
            sw.Stop();

            _logger.LogError(
                ex,
                "Not found error after {Elapsed} ms: {Message}",
                sw.ElapsedMilliseconds,
                ex.Message);

            context.Response.StatusCode = StatusCodes.Status404NotFound;
            await context.Response.WriteAsJsonAsync(new ApiResponse<object>
            {
                Success = false,
                Message = ex.Message
            });
        }
        catch (ArgumentException ex)
        {
            sw.Stop();

            _logger.LogWarning(
                ex,
                "Bad request after {Elapsed} ms: {Message}",
                sw.ElapsedMilliseconds,
                ex.Message);

            context.Response.StatusCode = StatusCodes.Status400BadRequest;
            await context.Response.WriteAsJsonAsync(new ApiResponse<object>
            {
                Success = false,
                Message = ex.Message
            });
        }
        catch (Exception ex)
        {
            sw.Stop();

            _logger.LogError(
                ex,
                "Unhandled exception after {Elapsed} ms: {Message}",
                sw.ElapsedMilliseconds,
                ex.Message);

            context.Response.StatusCode = StatusCodes.Status500InternalServerError;
            await context.Response.WriteAsJsonAsync(new ApiResponse<object>
            {
                Success = false,
                Message = ex.Message
            });
        }
    }
}
