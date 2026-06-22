using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BlotzTask.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddTestUserSeedData : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.InsertData(
                table: "PomodoroSettings",
                columns: new[] { "UserId", "Sound", "Timing" },
                values: new object[] { new Guid("718ccb8f-ce52-4e51-8cfe-2a44cdca77d1"), null, 25 });

            migrationBuilder.InsertData(
                table: "UserSubscriptions",
                columns: new[] { "Id", "CreatedAt", "PlanId", "UserId" },
                values: new object[] { new Guid("a1b2c3d4-e5f6-7890-abcd-ef1234567890"), new DateTime(2025, 9, 9, 14, 34, 27, 575, DateTimeKind.Utc), 1, new Guid("718ccb8f-ce52-4e51-8cfe-2a44cdca77d1") });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "PomodoroSettings",
                keyColumn: "UserId",
                keyValue: new Guid("718ccb8f-ce52-4e51-8cfe-2a44cdca77d1"));

            migrationBuilder.DeleteData(
                table: "UserSubscriptions",
                keyColumn: "Id",
                keyValue: new Guid("a1b2c3d4-e5f6-7890-abcd-ef1234567890"));
        }
    }
}
