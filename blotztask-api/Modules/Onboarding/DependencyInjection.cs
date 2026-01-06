using BlotzTask.Modules.Onboarding.Commands;

public static class DependencyInjection
{
  public static IServiceCollection AddOnboardingModule(this IServiceCollection services)
  {
     services.AddScoped<GetOnboardingStateQueryHandler>();
     services.AddScoped<UpdateOnboardingStepCommandHandler>();

      return services;
  }
}