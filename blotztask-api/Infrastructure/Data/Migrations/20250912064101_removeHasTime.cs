using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BlotzTask.Migrations
{
    /// <inheritdoc />
    public partial class removeHasTime : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "HasTime",
                table: "TaskItems");

            migrationBuilder.DropColumn(
                name: "HasTime",
                table: "DeletedTaskItems");

            migrationBuilder.UpdateData(
                table: "AppUsers",
                keyColumn: "Id",
                keyValue: new Guid("718ccb8f-ce52-4e51-8cfe-2a44cdca77d1"),
                columns: new[] { "CreationAt", "SignUpAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 9, 9, 22, 34, 27, 575, DateTimeKind.Local).AddTicks(6080), new DateTime(2025, 9, 9, 22, 33, 27, 955, DateTimeKind.Local), new DateTime(2025, 9, 9, 22, 34, 27, 575, DateTimeKind.Local).AddTicks(6080) });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "HasTime",
                table: "TaskItems",
                type: "bit",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "HasTime",
                table: "DeletedTaskItems",
                type: "bit",
                nullable: true);

            migrationBuilder.UpdateData(
                table: "AppUsers",
                keyColumn: "Id",
                keyValue: new Guid("718ccb8f-ce52-4e51-8cfe-2a44cdca77d1"),
                columns: new[] { "CreationAt", "SignUpAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 9, 10, 0, 34, 27, 575, DateTimeKind.Local).AddTicks(6080), new DateTime(2025, 9, 10, 0, 33, 27, 955, DateTimeKind.Local), new DateTime(2025, 9, 10, 0, 34, 27, 575, DateTimeKind.Local).AddTicks(6080) });
        }
    }
}
