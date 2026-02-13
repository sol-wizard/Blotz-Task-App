using BlotzTask.Modules.Notes.Commands;
using BlotzTask.Modules.Notes.Queries;

namespace BlotzTask.Modules.Notes;

public static class DependencyInjection
{
  public static IServiceCollection AddNotesModule(this IServiceCollection services)
  {
    services.AddScoped<CreateNoteCommandHandler>();
    services.AddScoped<UpdateNoteCommandHandler>();
    services.AddScoped<DeleteNoteCommandHandler>();
    services.AddScoped<SearchNotesQueryHandler>();
    services.AddScoped<TimeEstimateCommandHandler>();
    return services;
  }
}