using BlotzTask.Extension;
using BlotzTask.Middleware;
using BlotzTask.Modules.AiUsage;
using BlotzTask.Modules.Badges;
using BlotzTask.Modules.BreakDown;
using BlotzTask.Modules.ChatTaskGenerator;
using BlotzTask.Modules.Labels;
using BlotzTask.Modules.Notes;
using BlotzTask.Modules.Pomodoro;
using BlotzTask.Modules.Tasks;
using BlotzTask.Modules.Users;
using BlotzTask.Shared.Events;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

builder
    .AddSerilogLogging()
    .AddApplicationInsights();

// Core framework services
builder.Services.AddCoreServices();
builder.Services.AddDatabaseContext(builder.Configuration, builder.Environment);
builder.Services.AddAuth0JwtBearerAuthentication(builder.Configuration);
builder.Services.AddCustomCors();
builder.Services.AddScoped<IEventDispatcher, EventDispatcher>();

// Feature modules
builder.Services.AddAiUsageModule();
builder.Services.AddBadgeModule();
builder.Services.AddChatTaskGeneratorModule(builder.Configuration);
builder.Services.AddLabelModule();
builder.Services.AddNotesModule();
builder.Services.AddPomodoroModule();
builder.Services.AddTaskBreakdownModule();
builder.Services.AddTaskModule();
builder.Services.AddUserModule(builder.Configuration);

// External integrations
builder.Services.AddAgentFrameworkServices(builder.Configuration);

var app = builder.Build();

// Request pipeline
app.UseMiddleware<ErrorHandlingMiddleware>();

if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

app.UseCors("AllowSpecificOrigin");
app.UseAuthentication();
app.UseAuthorization();
app.UseMiddleware<UserContextMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c => { c.SwaggerEndpoint("/swagger/v1/swagger.json", "BlotzTask API V1"); });
}

// Endpoints
app.MapGet("/", (IHostEnvironment environment) => Results.Ok(new
{
    name = "BlotzTask API",
    status = "ok",
    environment = environment.EnvironmentName
}));
app.MapHealthChecks("/health");
app.MapControllers();
app.MapHub<AiTaskGenerateChatHub>("/ai-task-generate-chathub");

app.Lifetime.ApplicationStopped.Register(Log.CloseAndFlush);
app.Run();
