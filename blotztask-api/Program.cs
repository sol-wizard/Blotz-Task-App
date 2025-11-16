using Azure.Identity;
using Azure.Security.KeyVault.Secrets;
using BlotzTask.Extension;
using BlotzTask.Infrastructure.Data;
using BlotzTask.Middleware;
using BlotzTask.Modules.BreakDown;
using BlotzTask.Modules.ChatTaskGenerator;
using BlotzTask.Modules.Labels;
using BlotzTask.Modules.Tasks;
using BlotzTask.Modules.Users;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration.AzureKeyVault;
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

if (builder.Environment.IsDevelopment())
{
    var databaseConnectionString = builder.Configuration.GetConnectionString("DefaultConnection");
    builder.Services.AddDbContext<BlotzTaskDbContext>(options => options.UseSqlServer(databaseConnectionString));
}

if (builder.Environment.IsProduction())
{
    var keyVaultEndpoint = builder.Configuration["KeyVault:VaultURI"];
    builder.Configuration.AddAzureKeyVault(keyVaultEndpoint, new DefaultKeyVaultSecretManager());
    var secretClient = new SecretClient(new Uri(keyVaultEndpoint), new DefaultAzureCredential());
    builder.Services.AddSingleton(secretClient);

    var sqlConnectionSecret = secretClient.GetSecret("sql-connection-string").Value.Value;
    builder.Services.AddDbContext<BlotzTaskDbContext>(options =>
        options.UseSqlServer(sqlConnectionSecret));
}

builder.Services.AddAuth0(builder.Configuration);
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