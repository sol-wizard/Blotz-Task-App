using BlotzTask.Extension;
using BlotzTask.Middleware;
using BlotzTask.Modules.BreakDown;
using BlotzTask.Modules.ChatTaskGenerator;
using BlotzTask.Modules.Labels;
using BlotzTask.Modules.Notes;
using BlotzTask.Modules.SpeechToText;
using BlotzTask.Modules.Tasks;
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
builder.Services.AddUserModule(builder.Configuration);
builder.Services.AddLabelModule();
builder.Services.AddTaskBreakdownModule();
builder.Services.AddSpeechToTextModule(builder.Configuration);
builder.Services.AddNotesModule();

builder.Services.AddDatabaseContext(builder.Configuration, builder.Environment);

builder.Services.AddAuth0JwtBearerAuthentication(builder.Configuration);
builder.Services.AddAzureOpenAi();
builder.Services.AddSemanticKernelServices(builder.Configuration);
builder.Services.AddCustomCors();

var app = builder.Build();

app.UseMiddleware<ErrorHandlingMiddleware>();

app.UseCors("AllowSpecificOrigin");

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
