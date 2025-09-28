using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BlotzTask.Migrations
{
    /// <inheritdoc />
    public partial class AddTimeTypeColumn : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "TimeType",
                table: "TaskItems",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "TimeType",
                table: "DeletedTaskItems",
                type: "int",
                nullable: true);

            migrationBuilder.UpdateData(
                table: "AppUsers",
                keyColumn: "Id",
                keyValue: new Guid("718ccb8f-ce52-4e51-8cfe-2a44cdca77d1"),
                columns: new[] { "CreationAt", "SignUpAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 9, 9, 14, 34, 27, 575, DateTimeKind.Utc), new DateTime(2025, 9, 9, 14, 33, 27, 955, DateTimeKind.Utc), new DateTime(2025, 9, 9, 14, 34, 27, 575, DateTimeKind.Utc) });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "TimeType",
                table: "TaskItems");

            migrationBuilder.DropColumn(
                name: "TimeType",
                table: "DeletedTaskItems");

            migrationBuilder.UpdateData(
                table: "AppUsers",
                keyColumn: "Id",
                keyValue: new Guid("718ccb8f-ce52-4e51-8cfe-2a44cdca77d1"),
                columns: new[] { "CreationAt", "SignUpAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 9, 9, 22, 34, 27, 575, DateTimeKind.Local).AddTicks(6080), new DateTime(2025, 9, 9, 22, 33, 27, 955, DateTimeKind.Local), new DateTime(2025, 9, 9, 22, 34, 27, 575, DateTimeKind.Local).AddTicks(6080) });
        }
    }
}
