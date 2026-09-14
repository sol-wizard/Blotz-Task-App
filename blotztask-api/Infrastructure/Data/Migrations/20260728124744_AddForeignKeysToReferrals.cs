using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BlotzTask.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddForeignKeysToReferrals : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_Referrals_ReferrerUserId",
                table: "Referrals",
                column: "ReferrerUserId");

            migrationBuilder.AddForeignKey(
                name: "FK_Referrals_AppUsers_RefereeUserId",
                table: "Referrals",
                column: "RefereeUserId",
                principalTable: "AppUsers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Referrals_AppUsers_ReferrerUserId",
                table: "Referrals",
                column: "ReferrerUserId",
                principalTable: "AppUsers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Referrals_AppUsers_RefereeUserId",
                table: "Referrals");

            migrationBuilder.DropForeignKey(
                name: "FK_Referrals_AppUsers_ReferrerUserId",
                table: "Referrals");

            migrationBuilder.DropIndex(
                name: "IX_Referrals_ReferrerUserId",
                table: "Referrals");
        }
    }
}
