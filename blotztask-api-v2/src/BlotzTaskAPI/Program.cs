using BlotzTask.Application;
using BlotzTask.Infrastructure;
using BlotzTask.Infrastructure.Data;
using BlotzTask.Infrastructure.Data.Seeding;
using BlotzTask.Infrastructure.Identity;
using BlotzTaskAPI;
using BlotzTaskAPI.Middleware;
using Microsoft.AspNetCore.Identity;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDataProtection();
builder.AddApplicationServices();
builder.AddInfrastructureServices();
builder.Services.AddWebServices();
builder.Host.UseSerilog((context, services, configuration) =>
{
    configuration
        .ReadFrom.Configuration(context.Configuration)
        .ReadFrom.Services(services);
});

var app = builder.Build();

app.UseMiddleware<ExceptionHandlingMiddleware>();

if (app.Environment.IsDevelopment())
{
    using (var scope = app.Services.CreateScope())
    {
        var services = scope.ServiceProvider;
        await SeedingManager.SeedDevelopmentDatabaseAsync(services);
    }
}

app.UseSerilogRequestLogging();
app.UseSwagger();
app.UseSwaggerUI(options =>
{
    options.SwaggerEndpoint("/swagger/v1/swagger.json", "BlotzTask API V1");
    options.RoutePrefix = string.Empty; // ⬅️ This makes Swagger UI load at "/"
});

app.UseAuthentication();
app.UseAuthorization();
app.UseHttpsRedirection();
app.MapControllers().RequireAuthorization();
app.MapIdentityApi<ApplicationUser>();

app.Run();