using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BlotzTask.Migrations
{
    /// <inheritdoc />
    public partial class AddUserPreference : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "UserPreferences",
                columns: table => new
                {
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AutoRollover = table.Column<bool>(type: "bit", nullable: false, defaultValue: true),
                    UpcomingNotification = table.Column<bool>(type: "bit", nullable: false, defaultValue: true),
                    OverdueNotification = table.Column<bool>(type: "bit", nullable: false, defaultValue: false),
                    DailyPlanningNotification = table.Column<bool>(type: "bit", nullable: false, defaultValue: true),
                    EveningWrapUpNotification = table.Column<bool>(type: "bit", nullable: false, defaultValue: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserPreferences", x => x.UserId);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "UserPreferences");
        }
    }
}
