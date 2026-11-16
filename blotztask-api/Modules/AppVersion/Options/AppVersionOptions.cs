namespace BlotzTask.Modules.AppVersion.Options
{
    public sealed class AppVersionOptions
    {
        public PlatformVersionPolicy Ios {get;set;} = new();

        public PlatformVersionPolicy Android {get;set;} = new();
    }

    public sealed class PlatformVersionPolicy
    {
        public string LatestVersion {get;set;} = "";

        public string MinimumSupportedVersion {get;set;} = "";

        public string StoreUrl {get;set;} = "";

        // The website download page for APK installs (China users without Google Play).
        // Empty means "use StoreUrl"; Play builds always use StoreUrl.
        public string ApkDownloadUrl {get;set;} = "";
    }
}