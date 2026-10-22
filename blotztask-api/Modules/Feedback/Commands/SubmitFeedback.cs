using BlotzTask.Extension.Options;
using BlotzTask.Shared.Lark;
using Microsoft.Extensions.Options;

namespace BlotzTask.Modules.Feedback.Commands;

public class SubmitFeedbackCommand
{
    public required string Text { get; init; }
    public IFormFile? Image { get; init; }
}

public class SubmitFeedbackCommandHandler(
    ILarkBitableClient bitableClient,
    IOptions<LarkOptions> larkOptions,
    ILogger<SubmitFeedbackCommandHandler> logger)
{
    private const long MaxImageBytes = 5 * 1024 * 1024; // 5 MB client-side limit (Lark allows 20 MB)
    private static readonly string[] AllowedMimeTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];

    public async Task Handle(SubmitFeedbackCommand command, CancellationToken ct = default)
    {
        var opts = larkOptions.Value;

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

        var fields = BuildFields(command.Text, fileToken);
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

    private static Dictionary<string, object> BuildFields(string text, string? fileToken)
    {
        var fields = new Dictionary<string, object>
        {
            ["反馈详情"] = text,
            ["反馈时间"] = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
        };

        if (fileToken is not null)
            fields["图片"] = new[] { new { file_token = fileToken } };

        return fields;
    }
}
