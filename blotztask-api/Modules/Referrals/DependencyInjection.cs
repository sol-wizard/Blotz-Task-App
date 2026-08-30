using BlotzTask.Modules.Referrals.Commands;
using BlotzTask.Modules.Referrals.Services;
using BlotzTask.Modules.Referrals.Queries;

namespace BlotzTask.Modules.Referrals;

public static class DependencyInjection
{
    public static IServiceCollection AddReferralModule(this IServiceCollection services)
    {
        services.AddSingleton<ReferralCodeGenerator>();
        services.AddScoped<EnsureReferralCodeHandler>();
        services.AddScoped<RedeemReferralCodeCommandHandler>();
        services.AddScoped<GetMyReferralCodeQueryHandler>();
        return services;
    }
}
