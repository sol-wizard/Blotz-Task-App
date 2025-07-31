using Azure.Identity;
using Azure.Monitor.OpenTelemetry.AspNetCore;
using Azure.Security.KeyVault.Secrets;
using BlotzTask.Extension;
using BlotzTask.Infrastructure.Data;
using BlotzTask.Infrastructure.Data.Seeding;
using BlotzTask.Middleware;
using BlotzTask.Modules.AiTask.Services;
using BlotzTask.Modules.Chat;
using BlotzTask.Modules.Chat.Services;
using BlotzTask.Modules.Labels.Services;
using BlotzTask.Modules.Tasks.Services;
using BlotzTask.Modules.Users.Domain;
using BlotzTask.Modules.Users.Services;
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

builder.Logging.AddConsole();
builder.Logging.SetMinimumLevel(LogLevel.Debug);

// Add services to the container.
builder.Services.AddSignalR();

builder.Services.AddControllers();
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
builder.Services.AddApplicationInsightsTelemetry();

// add httpcontext and identitycore for UserInforService
builder.Services.AddIdentityCore<User>()
    .AddRoles<IdentityRole>()
    .AddEntityFrameworkStores<BlotzTaskDbContext>()
    .AddDefaultTokenProviders();

builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<ITaskService, TaskService>();
builder.Services.AddScoped<ILabelService, LabelService>();

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

builder.Host.UseSerilog((hostingContext, loggerConfiguration) =>
    loggerConfiguration.ReadFrom.Configuration(hostingContext.Configuration));

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

builder.Services.AddScoped<TaskGenerationAiService>();

if (builder.Environment.IsProduction())
{
    builder.Services.AddOpenTelemetry().UseAzureMonitor(options =>
    {
        var connectionString = builder.Configuration.GetSection("ApplicationInsights:ConnectionString").Value;
        options.ConnectionString = connectionString;
    });
}

// Register IChatCompletionService for Azure OpenAI
builder.Services.AddSingleton<IChatCompletionService>(sp =>
{
    var logger = sp.GetRequiredService<ILogger<Program>>();
    var config = builder.Configuration;
    var secretClient = sp.GetService<SecretClient>();
    var endpoint = config["AzureOpenAI:Endpoint"];
    var deploymentId = config["AzureOpenAI:DeploymentId"] ?? "gpt-4o-mini";
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

    if (string.IsNullOrWhiteSpace(endpoint) || string.IsNullOrWhiteSpace(apiKey) || string.IsNullOrWhiteSpace(deploymentId))
        throw new ArgumentException("Azure OpenAI configuration is missing or invalid.");

    logger.LogDebug("Initializing Azure OpenAI with endpoint: {Endpoint}, deployment: {DeploymentId}", endpoint, deploymentId);

    return Kernel.CreateBuilder()
        .AddAzureOpenAIChatCompletion(deploymentId, endpoint, apiKey)
        .Build()
        .GetRequiredService<IChatCompletionService>();
});

builder.Services.AddCors(options =>
{
    // CORS Best Practice https://q240iu43yr.feishu.cn/docx/JTkcdbwtloFHJWxvi0ocmTuOnjd?from=from_copylink
    options.AddPolicy("AllowSpecificOrigin",
        builder =>
        {
            builder.WithOrigins("http://localhost:3000" // DEV frontend origin
                , "https://blotz-task-app.vercel.app") // Prod frontend origin    
                .WithMethods("GET", "POST", "OPTIONS", "PUT", "DELETE") // Specify allowed methods
                .WithHeaders("Content-Type", "Authorization", "x-signalr-user-agent", "x-requested-with") // Added SignalR headers
                .AllowCredentials(); // TODO: anti-csrf need to be built.
        });
});

builder.Services.AddScoped<IConversationStateService, ConversationStateServiceV2>();
builder.Services.AddScoped<IGoalPlannerAiService, GoalPlannerAiService>();
builder.Services.AddScoped<IGoalPlannerChatService, GoalPlannerChatService>();
builder.Services.AddScoped<IRecurringTaskService, RecurringTaskService>();
builder.Services.AddScoped<ITaskParserService, TaskParserService>();
builder.Services.AddScoped<ISafeChatCompletionService, SafeChatCompletionService>();

var app = builder.Build();
app.UseMiddleware<ErrorHandlingMiddleware>();
app.UseMiddleware<UserContextMiddleware>();

app.MapIdentityApi<User>();
// Configure the HTTP request pipeline.

app.UseSwagger();
app.UseSwaggerUI();
app.UseSerilogRequestLogging();


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
app.MapHub<AiTaskChatHub>("/ai-task-chathub");
app.MapHub<ChatHub>("/chatHub");

app.Run();