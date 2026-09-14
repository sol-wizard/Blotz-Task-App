using BlotzTask.Modules.AiCoach.Domain.Conversations;
using FluentAssertions;
using Xunit.Abstractions;

namespace BlotzTask.Tests.AiCoach.Evaluation;

/// <summary>
/// Eval plan §9.3: 12 hand-labelled samples (3 clearly good, 3 unnecessary, 3 repeated / low
/// gain, 3 mode-mismatched). If the judge cannot sort these obvious cases, its scores must not
/// feed the GO / NO-GO decision and the live-case judge lines are advisory only.
/// </summary>
[Collection(AiCoachLiveModelCollection.Name)]
public class QuestionJudgeCalibrationTests(ITestOutputHelper output)
{
    private sealed record Sample(string Id, string Group, AiCoachMode Mode, string Transcript, string Question, bool ExpectedPass);

    private static readonly Sample[] Samples =
    [
        // --- clearly useful ---
        new("G1", "good", AiCoachMode.Execution,
            "User: 我想两周内完成论文摘要。\nAssistant: 你想先从哪一部分开始，比如先列提纲还是先整理资料？",
            "你想先从哪一部分开始，比如先列提纲还是先整理资料？", true),
        new("G2", "good", AiCoachMode.Companion,
            "User: 我脑子有点乱，你可以问我一个问题，帮我理理。\nAssistant: 现在最占你脑子的是哪一件事？",
            "现在最占你脑子的是哪一件事？", true),
        new("G3", "good", AiCoachMode.Execution,
            "User: 帮我安排复习。\nAssistant: 你打算先复习哪一科？",
            "你打算先复习哪一科？", true),

        // --- unnecessary ---
        new("U1", "unnecessary", AiCoachMode.Execution,
            "User: 帮我安排明天下午三点整理论文资料，做半小时。\nAssistant: 你想什么时候做？",
            "你想什么时候做？", false),
        new("U2", "unnecessary", AiCoachMode.Companion,
            "User: 你听我说就好，先别问。\nAssistant: 发生了什么？",
            "发生了什么？", false),
        new("U3", "unnecessary", AiCoachMode.Execution,
            "User: 明天上午去买菜，后天下午整理房间。\nAssistant: 你确定要安排这两件事吗？",
            "你确定要安排这两件事吗？", false),

        // --- repeated / low information gain ---
        new("R1", "repeat", AiCoachMode.Execution,
            "User: 我想两周内完成论文摘要。\nAssistant: 你想先从哪件具体的事开始？\nUser: 不知道，你帮我列一下。\nAssistant: 那你想先做哪一件？",
            "那你想先做哪一件？", false),
        new("R2", "repeat", AiCoachMode.Companion,
            "User: 我今天真的很累。\nAssistant: 你累吗？",
            "你累吗？", false),
        new("R3", "repeat", AiCoachMode.Execution,
            "User: 我想改善生活安排。\nAssistant: 你想改善生活安排吗？",
            "你想改善生活安排吗？", false),

        // --- mode mismatch ---
        new("M1", "mode", AiCoachMode.Companion,
            "User: 今天心情不太好。\nAssistant: 你想把这件事安排到明天几点做？",
            "你想把这件事安排到明天几点做？", false),
        new("M2", "mode", AiCoachMode.Execution,
            "User: 帮我安排明天跑步。\nAssistant: 这段时间你的感受怎么样？",
            "这段时间你的感受怎么样？", false),
        new("M3", "mode", AiCoachMode.Companion,
            "User: 最近总拖延。\nAssistant: 你想做什么？准备什么时候做？大概做多久？",
            "你想做什么？准备什么时候做？大概做多久？", false),
    ];

    [Fact]
    public async Task Judge_AgreesWithHumanLabels_OnTwelveObviousSamples()
    {
        var gateway = LiveModelGateway.TryCreate(out var deployment);
        if (gateway is null)
        {
            output.WriteLine("SKIPPED: no Azure OpenAI credentials or AICOACH_MODEL_TESTS=0.");
            return;
        }

        var judge = new LightweightJudge(gateway);
        var agreed = 0;
        var disagreements = new List<string>();
        var totalTokens = 0;

        foreach (var sample in Samples)
        {
            var (judgement, tokens) = await judge.JudgeQuestionAsync(sample.Mode, sample.Transcript, sample.Question);
            totalTokens += tokens;
            if (judgement is null)
            {
                disagreements.Add($"{sample.Id}: judge output unparseable");
                output.WriteLine($"{sample.Id} [{sample.Group}] expected {(sample.ExpectedPass ? "pass" : "fail")} → unparseable");
                continue;
            }

            var agrees = judgement.Passed == sample.ExpectedPass;
            if (agrees) agreed++;
            else disagreements.Add($"{sample.Id} ({sample.Group}): expected {(sample.ExpectedPass ? "pass" : "fail")}, judge said {(judgement.Passed ? "pass" : "fail")} {judgement.ReasonCode}");

            output.WriteLine($"{sample.Id} [{sample.Group}] expected {(sample.ExpectedPass ? "pass" : "fail")} → "
                             + $"{(judgement.Passed ? "pass" : "fail")} {judgement.Necessary}/{judgement.Focused}/{judgement.InformationGain}/{judgement.ModeFit} "
                             + $"{judgement.ReasonCode} — {judgement.Reason}{(agrees ? "" : "   <-- DISAGREES")}");
        }

        output.WriteLine($"agreement: {agreed}/{Samples.Length} on {deployment} ({totalTokens} tokens, {LightweightJudge.Version})");
        foreach (var line in disagreements)
            output.WriteLine("  " + line);

        agreed.Should().BeGreaterThanOrEqualTo(10,
            because: "a judge that cannot sort obvious samples must not influence GO / NO-GO (eval plan §9.3)");
    }
}
