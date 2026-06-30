using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BlotzTask.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddIdToUserBadge : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropPrimaryKey(
                name: "PK_UserBadges",
                table: "UserBadges");

            migrationBuilder.AddColumn<int>(
                name: "Id",
                table: "UserBadges",
                type: "int",
                nullable: false,
                defaultValue: 0)
                .Annotation("SqlServer:Identity", "1, 1");

            migrationBuilder.AddPrimaryKey(
                name: "PK_UserBadges",
                table: "UserBadges",
                column: "Id");

            migrationBuilder.CreateIndex(
                name: "IX_UserBadges_UserId_BadgeId",
                table: "UserBadges",
                columns: new[] { "UserId", "BadgeId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropPrimaryKey(
                name: "PK_UserBadges",
                table: "UserBadges");

            migrationBuilder.DropIndex(
                name: "IX_UserBadges_UserId_BadgeId",
                table: "UserBadges");

            migrationBuilder.DropColumn(
                name: "Id",
                table: "UserBadges");

            migrationBuilder.AddPrimaryKey(
                name: "PK_UserBadges",
                table: "UserBadges",
                columns: new[] { "UserId", "BadgeId" });
        }
    }
}
