using Azure.Identity;
using Azure.Security.KeyVault.Secrets;
using BlotzTask.Extension;
using BlotzTask.Infrastructure.Data;
using BlotzTask.Middleware;
using BlotzTask.Modules.BreakDown;
using BlotzTask.Modules.ChatTaskGenerator;
using BlotzTask.Modules.ChatTaskGenerator.Services;
using BlotzTask.Modules.Labels;
using BlotzTask.Modules.Tasks;

using BlotzTask.Modules.Users;
using BlotzTask.Shared.Store;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration.AzureKeyVault;
using Microsoft.SemanticKernel;
using Microsoft.SemanticKernel.ChatCompletion;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

builder
    .AddSerilogLogging()
    .AddApplicationInsights();

// Add services to the container.
builder.Services.AddSignalR();
builder.Services.AddControllers();
builder.Services.AddHealthChecks();

//TODO : Move all services to module based registration


builder.Services.AddScoped<IChatHistoryManagerService, ChatHistoryManagerService>();
builder.Services.AddScoped<IAiTaskGenerateService, AiTaskGenerateService>();



builder.Services.AddSingleton(new ChatHistoryStore(
    TimeSpan.FromMinutes(30), // Sessions expire after 30 minutes of inactivity
    TimeSpan.FromMinutes(5) // Scanning every 5 minutes
));

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
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Register the Kernel as a singleton service
builder.Services.AddSingleton<Kernel>(sp =>
{
    var logger = sp.GetRequiredService<ILogger<Program>>();
    var config = builder.Configuration;
    var secretClient = sp.GetService<SecretClient>();
    var endpoint = config["AzureOpenAI:Endpoint"];
    var deploymentId = config["AzureOpenAI:DeploymentId"];
    var apiKey = config["AzureOpenAI:ApiKey"];

    if (secretClient != null && builder.Environment.IsProduction())
        try
        {
            apiKey = secretClient.GetSecret("azureopenai-apikey").Value.Value;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to retrieve API key from Azure Key Vault");
        }

    var kernelBuilder = Kernel.CreateBuilder();

    kernelBuilder.AddAzureOpenAIChatCompletion(
        deploymentId,
        endpoint,
        apiKey
    );

    return kernelBuilder.Build();
});

builder.Services.AddScoped<IChatCompletionService>(sp =>
{
    var kernel = sp.GetRequiredService<Kernel>();
    return kernel.GetRequiredService<IChatCompletionService>();
});

builder.Services.AddCors(options =>
{
    // CORS Best Practice https://q240iu43yr.feishu.cn/docx/JTkcdbwtloFHJWxvi0ocmTuOnjd?from=from_copylink
    options.AddPolicy("AllowSpecificOrigin",
        builder =>
        {
            builder.WithOrigins("http://localhost:3000" // DEV frontend origin
                    , "http://localhost:8081" // DEV mobile app origin
                    , "https://blotz-task-app.vercel.app") // Prod frontend origin    
                .WithMethods("GET", "POST", "OPTIONS", "PUT", "DELETE") // Specify allowed methods
                .WithHeaders("Content-Type", "Authorization", "x-signalr-user-agent",
                    "x-requested-with") // Added SignalR headers
                .AllowCredentials(); // TODO: anti-csrf need to be built.
        });
});

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