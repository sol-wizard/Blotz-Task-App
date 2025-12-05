using System.Diagnostics;
using BlotzTask.Extension;
using BlotzTask.Middleware;
using BlotzTask.Modules.BreakDown;
using BlotzTask.Modules.ChatTaskGenerator;
using BlotzTask.Modules.Labels;
using BlotzTask.Modules.Tasks;
using BlotzTask.Modules.TimeEstimate;
using BlotzTask.Modules.Users;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

builder
    .AddSerilogLogging()
    .AddApplicationInsights();

// Add services to the container.
builder.Services.AddCoreServices();
builder.Services.AddChatTaskGeneratorModule();

builder.Services.AddTaskModule();
builder.Services.AddUserModule();
builder.Services.AddLabelModule();
builder.Services.AddTaskBreakdownModule();
builder.Services.AddTimeEstimateModule();

builder.Services.AddDatabaseContext(builder.Configuration, builder.Environment);

builder.Services.AddAuth0(builder.Configuration);
builder.Services.AddAzureOpenAi();
builder.Services.AddSemanticKernelServices(builder.Configuration, builder.Environment);
builder.Services.AddCustomCors();

var app = builder.Build();

var logger = app.Logger;

app.Use(async (context, next) =>
{
    var sw = Stopwatch.StartNew();
    logger.LogInformation("Request starting {Method} {Path}",
        context.Request.Method, context.Request.Path);

    await next();

    sw.Stop();
    logger.LogInformation("Request finished {Method} {Path} in {Elapsed} ms, StatusCode {StatusCode}",
        context.Request.Method,
        context.Request.Path,
        sw.ElapsedMilliseconds,
        context.Response.StatusCode);
});

app.UseMiddleware<ErrorHandlingMiddleware>();

app.Use(async (context, next) =>
{
    var sw = Stopwatch.StartNew();
    await next();
    sw.Stop();
    logger.LogInformation("From ErrorHandlingMiddleware -> end of pipeline took {Elapsed} ms for {Path}",
        sw.ElapsedMilliseconds, context.Request.Path);
});

app.UseCors("AllowSpecificOrigin");

app.Use(async (context, next) =>
{
    var sw = Stopwatch.StartNew();
    await next();
    sw.Stop();
    logger.LogInformation("From Authentication -> end of pipeline took {Elapsed} ms for {Path}",
        sw.ElapsedMilliseconds, context.Request.Path);
});

app.UseAuthentication();
app.UseAuthorization();
app.UseMiddleware<UserContextMiddleware>();

app.MapGet("/", () => Results.Content(
    "<html><body><h1>Web API is running</h1></body></html>",
    "text/html"));
app.MapHealthChecks("/health");

if (!app.Environment.IsDevelopment()) app.UseHttpsRedirection();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c => { c.SwaggerEndpoint("/swagger/v1/swagger.json", "BlotzTask API V1"); });
}

app.MapControllers();
app.MapHub<AiTaskGenerateChatHub>("/ai-task-generate-chathub");
app.Lifetime.ApplicationStopped.Register(Log.CloseAndFlush);
app.Run();