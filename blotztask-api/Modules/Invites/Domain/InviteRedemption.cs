

namespace BlotzTask.Modules.Invites.Domain;
public class InviteRedemption
{
        public int Id {get;set;}
        public Guid InviterId {get;set; }

        public Guid RedeemerId {get;set; }

        public DateTimeOffset RedeemedAt {get;set; }
        

}
