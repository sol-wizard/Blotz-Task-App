namespace BlotzTask.Tests.AiCoach.Evaluation;

/// <summary>
/// Deterministic question checks (eval plan §9.1): count, repetition, normalization. No
/// embeddings, no vector store — a normalized text comparison plus topic bookkeeping is enough
/// for the first pass; semantic repeats are left to the lightweight judge.
/// </summary>
public static class QuestionQualityEvaluator
{
    public static int CountQuestionMarks(string? text) =>
        text?.Count(c => c is '?' or '？') ?? 0;

    /// <summary>Whitespace- and punctuation-insensitive, case-folded form of a question.</summary>
    public static string Normalize(string text) =>
        new string(text.Where(c => !char.IsWhiteSpace(c) && !char.IsPunctuation(c)).ToArray())
            .ToLowerInvariant();

    /// <summary>Same question again, or one wholly contained in the other after normalization.</summary>
    public static bool IsRepeat(string question, string previousQuestion)
    {
        var current = Normalize(question);
        var previous = Normalize(previousQuestion);
        if (current.Length == 0 || previous.Length == 0)
            return false;
        return current == previous || current.Contains(previous) || previous.Contains(current);
    }
}
