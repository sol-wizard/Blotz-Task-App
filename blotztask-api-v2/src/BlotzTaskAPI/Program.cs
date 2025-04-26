using BlotzTask.Application;
using BlotzTask.Infrastructure;
using BlotzTaskAPI;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDataProtection();
builder.AddApplicationServices();
builder.AddInfrastructureServices();
builder.Services.AddWebServices();

var app = builder.Build();

app.UseSwagger();
app.UseSwaggerUI(options =>
{
    options.SwaggerEndpoint("/swagger/v1/swagger.json", "BlotzTask API V1");
    options.RoutePrefix = string.Empty; // ⬅️ This makes Swagger UI load at "/"
});

app.UseHttpsRedirection();
app.MapControllers();

app.Run();