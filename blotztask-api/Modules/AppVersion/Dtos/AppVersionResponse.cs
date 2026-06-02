namespace BlotzTask.Modules.AppVersion.Dtos;

public sealed record AppVersionResponse(
    PlatformVersionPolicyResponse Ios,
    PlatformVersionPolicyResponse Android
);

public sealed record PlatformVersionPolicyResponse(
    string LatestVersion,
    string MinimumSupportedVersion,
    string StoreUrl
);
