using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BlotzTask.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class ReplaceInviteSystemWithReferralSystem : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "InviteRedemptions");

            migrationBuilder.DropColumn(
                name: "InviteCode",
                table: "AppUsers");

            migrationBuilder.CreateTable(
                name: "ReferralCodes",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    OwnerUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Code = table.Column<string>(type: "nvarchar(12)", maxLength: 12, nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ReferralCodes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ReferralCodes_AppUsers_OwnerUserId",
                        column: x => x.OwnerUserId,
                        principalTable: "AppUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Referrals",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ReferrerUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RefereeUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CodeUsed = table.Column<string>(type: "nvarchar(12)", maxLength: 12, nullable: false),
                    RedeemedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Referrals", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ReferralCodes_Code",
                table: "ReferralCodes",
                column: "Code",
                unique: true,
                filter: "[Code] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_ReferralCodes_OwnerUserId",
                table: "ReferralCodes",
                column: "OwnerUserId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Referrals_RefereeUserId",
                table: "Referrals",
                column: "RefereeUserId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ReferralCodes");

            migrationBuilder.DropTable(
                name: "Referrals");

            migrationBuilder.AddColumn<string>(
                name: "InviteCode",
                table: "AppUsers",
                type: "nvarchar(10)",
                maxLength: 10,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "InviteRedemptions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    InviterId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RedeemedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    RedeemerId = table.Column<Guid>(type: "uniqueidentifier", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_InviteRedemptions", x => x.Id);
                });

            migrationBuilder.UpdateData(
                table: "AppUsers",
                keyColumn: "Id",
                keyValue: new Guid("718ccb8f-ce52-4e51-8cfe-2a44cdca77d1"),
                column: "InviteCode",
                value: null);
        }
    }
}
