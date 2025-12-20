using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BlotzTask.Migrations
{
    /// <inheritdoc />
    public partial class AddUserPreferenceSeeding : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.InsertData(
                table: "UserPreferences",
                columns: new[] { "UserId", "AutoRollover", "OverdueNotification", "UpcomingNotification" },
                values: new object[] { new Guid("718ccb8f-ce52-4e51-8cfe-2a44cdca77d1"), true, true, true });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "UserPreferences",
                keyColumn: "UserId",
                keyValue: new Guid("718ccb8f-ce52-4e51-8cfe-2a44cdca77d1"));
        }
    }
}
