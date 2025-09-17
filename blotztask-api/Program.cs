using Azure.Identity;
using Azure.Monitor.OpenTelemetry.AspNetCore;
using Azure.Security.KeyVault.Secrets;
using BlotzTask.Extension;
using BlotzTask.Infrastructure.Data;
using BlotzTask.Middleware;
using BlotzTask.Modules.AiTask.Services;
using BlotzTask.Modules.BreakDown;
using BlotzTask.Modules.BreakDown.Plugins;
using BlotzTask.Modules.BreakDown.Services;
using BlotzTask.Modules.ChatGoalPlanner;
using BlotzTask.Modules.ChatGoalPlanner.Services;
using BlotzTask.Modules.ChatTaskGenerator;
using BlotzTask.Modules.ChatTaskGenerator.Plugins;
using BlotzTask.Modules.ChatTaskGenerator.Services;
using BlotzTask.Modules.Tasks;
using BlotzTask.Modules.Tasks.Services;
using BlotzTask.Modules.Users;
using BlotzTask.Shared.Services;
using BlotzTask.Shared.Store;
using Microsoft.ApplicationInsights.Extensibility;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration.AzureKeyVault;
using Microsoft.OpenApi.Models;
using Microsoft.SemanticKernel;
using Microsoft.SemanticKernel.ChatCompletion;
using Serilog;
using Swashbuckle.AspNetCore.Filters;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddApplicationInsightsTelemetry();

// Configure Serilog to integrate with Microsoft.Extensions.Logging
builder.Host.UseSerilog((context, services, configuration) =>
{
    configuration
        .ReadFrom.Configuration(context.Configuration)
        .ReadFrom.Services(services)
        .Enrich.FromLogContext()
        .MinimumLevel.Debug()
        .MinimumLevel.Override("Microsoft", Serilog.Events.LogEventLevel.Warning)
        .MinimumLevel.Override("System", Serilog.Events.LogEventLevel.Warning)
        .WriteTo.ApplicationInsights(
        services.GetRequiredService<TelemetryConfiguration>(),
        TelemetryConverter.Traces);
});

// Add services to the container.
builder.Services.AddSignalR();
builder.Services.AddControllers();
builder.Services.AddHealthChecks();
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.AddSecurityDefinition("oauth2", new OpenApiSecurityScheme
    {
        In = ParameterLocation.Header,
        Name = "Authorization",
        Type = SecuritySchemeType.ApiKey
    });
    options.OperationFilter<SecurityRequirementsOperationFilter>();
});

//TODO : Move all services to module based registration
builder.Services.AddScoped<ITaskService, TaskService>();
builder.Services.AddScoped<TaskGenerationAiService>();

builder.Services.AddScoped<IConversationStateService, ConversationStateService>();
builder.Services.AddScoped<IGoalPlannerAiService, GoalPlannerAiService>();
builder.Services.AddScoped<IGoalPlannerChatService, GoalPlannerChatService>();
builder.Services.AddScoped<IRecurringTaskService, RecurringTaskService>();

builder.Services.AddScoped<IAiTaskGenerateService, AiTaskGenerateService>();
builder.Services.AddScoped<IChatHistoryManagerService, ChatHistoryManagerService>();
builder.Services.AddScoped<ITaskGenerateChatService, TaskGenerateChatService>();

builder.Services.AddScoped<TaskParsingService>();
builder.Services.AddScoped<ISafeChatCompletionService, SafeChatCompletionService>();
builder.Services.AddScoped<ITaskBreakdownService, TaskBreakdownService>();
builder.Services.AddSingleton(new ChatHistoryStore(
    expiration: TimeSpan.FromMinutes(30),  // Sessions expire after 30 minutes of inactivity
    cleanupInterval: TimeSpan.FromMinutes(5) // Scanning every 5 minutes
));

builder.Services.AddTaskModule();
builder.Services.AddUserModule();
builder.Services.AddLabelModule();

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
    
    builder.Services.AddOpenTelemetry().UseAzureMonitor(options =>
    {
        var connectionString = builder.Configuration.GetSection("ApplicationInsights:ConnectionString").Value;
        options.ConnectionString = connectionString;
    });
}

builder.Services.AddAuth0(builder.Configuration);
builder.Services.AddAzureOpenAi();

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
    {
        try
        {
            apiKey = secretClient.GetSecret("azureopenai-apikey").Value.Value;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to retrieve API key from Azure Key Vault");
        }
    }

    var kernelBuilder = Kernel.CreateBuilder();
    
    kernelBuilder.AddAzureOpenAIChatCompletion(
        deploymentName: deploymentId,
        endpoint: endpoint,
        apiKey: apiKey
    );
    
    kernelBuilder.Plugins.AddFromObject(new TaskExtractionPlugin(), "TaskExtractionPlugin");
    kernelBuilder.Plugins.AddFromObject(new TaskBreakdownPlugin(), "TaskBreakdownPlugin");

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
                .WithHeaders("Content-Type", "Authorization", "x-signalr-user-agent", "x-requested-with") // Added SignalR headers
                .AllowCredentials(); // TODO: anti-csrf need to be built.
        });
});



var app = builder.Build();
app.UseMiddleware<ErrorHandlingMiddleware>();
app.UseMiddleware<UserContextMiddleware>();

// "Add root path for app service always on ping"
app.MapGet("/", () => Results.Ok("Web API is running"));
app.MapHealthChecks("/health");

app.UseSwagger();
app.UseSwaggerUI();
app.UseHttpsRedirection();

app.UseCors("AllowSpecificOrigin");
app.UseAuthorization();

app.MapControllers();
app.MapHub<GoalPlannerChatHub>("/chatHub");
app.MapHub<AiTaskGenerateChatHub>("/ai-task-generate-chathub");
app.MapHub<AiTaskBreakDownChat>("/ai-task-breakdown-chathub");
app.Lifetime.ApplicationStopped.Register(Log.CloseAndFlush);
app.Run();