using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BlotzTask.Migrations
{
    /// <inheritdoc />
    public partial class SeedDevUser : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.InsertData(
                table: "AppUsers",
                columns: new[] { "Id", "Auth0UserId", "CreationAt", "DisplayName", "Email", "PictureUrl", "SignUpAt", "UpdatedAt" },
                values: new object[] { new Guid("718ccb8f-ce52-4e51-8cfe-2a44cdca77d1"), "auth0|68c03ab7a093c0727999a791", new DateTime(2025, 9, 10, 0, 34, 27, 575, DateTimeKind.Local).AddTicks(6080), "blotztest1@gmail.com", "blotztest1@gmail.com", "https://s.gravatar.com/avatar/d7eee1179900d1154cf2b3a64f7f91dd?s=480&r=pg&d=https%3A%2F%2Fcdn.auth0.com%2Favatars%2Fbl.png", new DateTime(2025, 9, 10, 0, 33, 27, 955, DateTimeKind.Local), new DateTime(2025, 9, 10, 0, 34, 27, 575, DateTimeKind.Local).AddTicks(6080) });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "AppUsers",
                keyColumn: "Id",
                keyValue: new Guid("718ccb8f-ce52-4e51-8cfe-2a44cdca77d1"));
        }
    }
}
