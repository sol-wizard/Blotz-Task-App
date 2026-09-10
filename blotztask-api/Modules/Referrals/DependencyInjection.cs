using BlotzTask.Modules.Referrals.Commands;
using BlotzTask.Modules.Referrals.Events;
using BlotzTask.Modules.Referrals.Services;
using BlotzTask.Modules.Referrals.Queries;
using BlotzTask.Shared.Events;

namespace BlotzTask.Modules.Referrals;

public static class DependencyInjection
{
    public static IServiceCollection AddReferralModule(this IServiceCollection services)
    {
        services.AddSingleton<ReferralCodeGenerator>();
        services.AddScoped<EnsureReferralCodeHandler>();
        services.AddScoped<RedeemReferralCodeCommandHandler>();
        services.AddScoped<GetMyReferralCodeQueryHandler>();
        
        // Event handlers
        services.AddScoped<IDomainEventHandler<ReferralCodeRedeemedEvent>, ReferralCodeRedeemedEventHandler>();
        return services;
    }
}
