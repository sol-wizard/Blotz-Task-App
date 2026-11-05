using BlotzTask.Extension.Options;
using BlotzTask.Shared.Lark;
using Microsoft.Extensions.Options;

namespace BlotzTask.Modules.Feedback.Commands;

public class SubmitFeedbackCommand
{
    public required string Text { get; init; }
    public required Guid UserId { get; init; }
    public IFormFile? Image { get; init; }
    public string? AppVersion { get; init; }
    public string? Platform { get; init; }
    public string? DeviceModel { get; init; }
}

public class SubmitFeedbackCommandHandler(
    ILarkBitableClient bitableClient,
    IOptions<LarkOptions> larkOptions,
    IHostEnvironment hostEnvironment,
    ILogger<SubmitFeedbackCommandHandler> logger)
{
    private const long MaxImageBytes = 5 * 1024 * 1024; // 5 MB client-side limit (Lark allows 20 MB)
    private static readonly string[] AllowedMimeTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];

    public async Task Handle(SubmitFeedbackCommand command, CancellationToken ct = default)
    {
        var opts = larkOptions.Value;
        var submitTime = DateTimeOffset.UtcNow;

        string? fileToken = null;
        if (command.Image is not null)
        {
            ValidateImage(command.Image);
            await using var stream = command.Image.OpenReadStream();
            fileToken = await bitableClient.UploadImageAsync(
                stream,
                command.Image.FileName,
                command.Image.Length,
                opts.FeedbackBaseToken,
                ct);
        }

        var fields = BuildFields(command.Text, command.UserId, submitTime, hostEnvironment.EnvironmentName,
            command.AppVersion, command.Platform, command.DeviceModel, fileToken);
        await bitableClient.CreateRecordAsync(opts.FeedbackBaseToken, opts.FeedbackTableId, fields, ct);

        logger.LogInformation("Feedback submitted, hasImage={HasImage}", fileToken is not null);
    }

    private static void ValidateImage(IFormFile image)
    {
        if (image.Length > MaxImageBytes)
            throw new ArgumentException($"Image exceeds the {MaxImageBytes / 1024 / 1024} MB limit.");

        if (!AllowedMimeTypes.Contains(image.ContentType.ToLowerInvariant()))
            throw new ArgumentException($"Unsupported image type '{image.ContentType}'.");
    }

    private static Dictionary<string, object> BuildFields(
        string text,
        Guid userId,
        DateTimeOffset submitTime,
        string environment,
        string? appVersion,
        string? platform,
        string? deviceModel,
        string? fileToken)
    {
        var fields = new Dictionary<string, object>
        {
            ["反馈详情"] = text,
            ["反馈时间"] = submitTime.ToUnixTimeMilliseconds(),
            ["用户ID"] = userId.ToString(),
            ["提交时间"] = submitTime.ToString("O"),
            ["运行环境"] = environment
        };

        if (appVersion is not null) fields["应用版本"] = appVersion;
        if (platform is not null) fields["平台"] = platform;
        if (deviceModel is not null) fields["设备型号"] = deviceModel;
        if (fileToken is not null) fields["图片"] = new[] { new { file_token = fileToken } };

        return fields;
    }
}
