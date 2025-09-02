using Azure.Identity;
using Azure.Monitor.OpenTelemetry.AspNetCore;
using Azure.Security.KeyVault.Secrets;
using BlotzTask.Extension;
using BlotzTask.Infrastructure.Data;
using BlotzTask.Infrastructure.Data.Seeding;
using BlotzTask.Middleware;
using BlotzTask.Modules.AiTask.Services;
using BlotzTask.Modules.BreakDown;
using BlotzTask.Modules.BreakDown.Services;
using BlotzTask.Modules.ChatGoalPlanner;
using BlotzTask.Modules.ChatGoalPlanner.Services;
using BlotzTask.Modules.ChatTaskGenerator;
using BlotzTask.Modules.ChatTaskGenerator.Plugins;
using BlotzTask.Modules.ChatTaskGenerator.Services;
using BlotzTask.Modules.Labels.Services;
using BlotzTask.Modules.Tasks;
using BlotzTask.Modules.Tasks.Services;
using BlotzTask.Modules.Users.Domain;
using BlotzTask.Modules.Users.Services;
using BlotzTask.Shared.Services;
using Microsoft.ApplicationInsights.Extensibility;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Identity;
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

// add httpcontext and identitycore for UserInforService
builder.Services.AddIdentityCore<User>()
    .AddRoles<IdentityRole>()
    .AddEntityFrameworkStores<BlotzTaskDbContext>()
    .AddDefaultTokenProviders();

builder.Services.AddIdentityApiEndpoints<User>()
    .AddRoles<IdentityRole>()
    .AddEntityFrameworkStores<BlotzTaskDbContext>();
builder.Services.AddAuthorization();
builder.Services.ConfigureApplicationCookie(options =>
{
    options.AccessDeniedPath = "/Identity/Account/AccessDenied";
    options.Cookie.Name = "YourAppCookieName";
    options.Cookie.HttpOnly = true;
    options.ExpireTimeSpan = TimeSpan.FromDays(7);
    options.LoginPath = "/Identity/Account/Login";
    options.ReturnUrlParameter = CookieAuthenticationDefaults.ReturnUrlParameter;
    options.SlidingExpiration = true;
});

//TODO : Move all services to module based registration
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<ITaskService, TaskService>();
builder.Services.AddScoped<ILabelService, LabelService>();
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

builder.Services.AddTaskModule();

if (builder.Environment.IsDevelopment())
{
    var databaseConnectionString = builder.Configuration.GetConnectionString("DefaultConnection");
    builder.Services.AddDbContext<BlotzTaskDbContext>(options => options.UseSqlServer(databaseConnectionString));
}

if (builder.Environment.IsProduction())
{
    var keyVaultEndpoint = builder.Configuration.GetSection("KeyVault").GetValue<string>("VaultURI");

    builder.Configuration.AddAzureKeyVault(keyVaultEndpoint, new DefaultKeyVaultSecretManager());

    var secretClient = new SecretClient(new Uri(keyVaultEndpoint), new DefaultAzureCredential());

    builder.Services.AddSingleton(secretClient);

    builder.Services.AddDbContext<BlotzTaskDbContext>(options => options.UseSqlServer(secretClient.GetSecret("sql-connection-string").Value.Value.ToString()));
}

builder.Services.AddAzureOpenAi();

if (builder.Environment.IsProduction())
{
    builder.Services.AddOpenTelemetry().UseAzureMonitor(options =>
    {
        var connectionString = builder.Configuration.GetSection("ApplicationInsights:ConnectionString").Value;
        options.ConnectionString = connectionString;
    });
}

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

app.MapIdentityApi<User>();
app.MapHealthChecks("/health");
// Configure the HTTP request pipeline.

app.UseSwagger();
app.UseSwaggerUI();

using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;

    try
    {
        var roleManager = services.GetRequiredService<RoleManager<IdentityRole>>();
        var userManager = services.GetRequiredService<UserManager<User>>();

        await BlotzContextSeed.SeedBlotzUserAsync(userManager, roleManager);

    }
    catch (Exception ex)
    {
        var logger = services.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "An error occurred while seeding the guest user.");
    }
}


app.UseHttpsRedirection();

app.UseCors("AllowSpecificOrigin");
app.UseAuthorization();

app.MapSwagger().RequireAuthorization();
app.MapControllers();
app.MapHub<GoalPlannerChatHub>("/chatHub");
app.MapHub<AiTaskGenerateChatHub>("/ai-task-generate-chathub");
app.MapHub<AiTaskBreakDownChat>("/ai-task-breakdown-chathub");
app.Lifetime.ApplicationStopped.Register(Log.CloseAndFlush);
app.Run();