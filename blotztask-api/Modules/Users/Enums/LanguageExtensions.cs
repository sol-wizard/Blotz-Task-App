namespace BlotzTask.Modules.Users.Enums;

public static class LanguageExtensions
{
    public static string ToDisplayName(this Language language) => language switch
    {
        Language.En => "English",
        Language.Zh => "Chinese (Simplified)",
        _ => "English"
    };
}
