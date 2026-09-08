using Sqids;

namespace BlotzTask.Modules.Referrals.Services;

public class ReferralCodeGenerator
{
    private const string Alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    private readonly SqidsEncoder<int> _sqids = new(new SqidsOptions
    {
        Alphabet = Alphabet,
        MinLength = 8
    });

    public string Encode(int id) => _sqids.Encode(id);
}
