using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BlotzTask.Migrations
{
    /// <inheritdoc />
    public partial class SupportSingleTime : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "TimeType",
                table: "TaskItems",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "TimeType",
                table: "DeletedTaskItems",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.UpdateData(
                table: "AppUsers",
                keyColumn: "Id",
                keyValue: new Guid("718ccb8f-ce52-4e51-8cfe-2a44cdca77d1"),
                columns: new[] { "CreationAt", "SignUpAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 9, 10, 0, 34, 27, 575, DateTimeKind.Local).AddTicks(6080), new DateTime(2025, 9, 10, 0, 33, 27, 955, DateTimeKind.Local), new DateTime(2025, 9, 10, 0, 34, 27, 575, DateTimeKind.Local).AddTicks(6080) });

            migrationBuilder.Sql(@"
                -- TaskItems: 补齐缺的一边
                UPDATE t SET EndTime  = StartTime, TimeType = 0
                FROM dbo.TaskItems t
                WHERE t.StartTime IS NOT NULL AND t.EndTime IS NULL;

                UPDATE t SET StartTime = EndTime, TimeType = 0
                FROM dbo.TaskItems t
                WHERE t.StartTime IS NULL AND t.EndTime IS NOT NULL;

                -- DeletedTaskItems 同样处理
                UPDATE t SET EndTime  = StartTime, TimeType = 0
                FROM dbo.DeletedTaskItems t
                WHERE t.StartTime IS NOT NULL AND t.EndTime IS NULL;

                UPDATE t SET StartTime = EndTime, TimeType = 0
                FROM dbo.DeletedTaskItems t
                WHERE t.StartTime IS NULL AND t.EndTime IS NOT NULL;
            ");

            migrationBuilder.AddCheckConstraint(
                name: "CK_TaskItems_SingleTimeValidation",
                table: "TaskItems",
                sql: "([TimeType] <> 0) OR ([StartTime] = [EndTime])");

            migrationBuilder.AddCheckConstraint(
                name: "CK_TaskItems_TimeRangeValidation",
                table: "TaskItems",
                sql: "([StartTime] IS NULL AND [EndTime] IS NULL) OR ([StartTime] IS NOT NULL AND [EndTime] IS NOT NULL)");

            migrationBuilder.AddCheckConstraint(
                name: "CK_TaskItems_TimeType_Valid",
                table: "TaskItems",
                sql: "[TimeType] IN (0,1)");

            migrationBuilder.AddCheckConstraint(
                name: "CK_DeletedTaskItems_SingleTimeValidation",
                table: "DeletedTaskItems",
                sql: "([TimeType] <> 0) OR ([StartTime] = [EndTime])");

            migrationBuilder.AddCheckConstraint(
                name: "CK_DeletedTaskItems_TimeRangeValidation",
                table: "DeletedTaskItems",
                sql: "([StartTime] IS NULL AND [EndTime] IS NULL) OR ([StartTime] IS NOT NULL AND [EndTime] IS NOT NULL)");

            migrationBuilder.AddCheckConstraint(
                name: "CK_DeletedTaskItems_TimeType_Valid",
                table: "DeletedTaskItems",
                sql: "[TimeType] IN (0,1)");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_TaskItems_SingleTimeValidation",
                table: "TaskItems");

            migrationBuilder.DropCheckConstraint(
                name: "CK_TaskItems_TimeRangeValidation",
                table: "TaskItems");

            migrationBuilder.DropCheckConstraint(
                name: "CK_TaskItems_TimeType_Valid",
                table: "TaskItems");

            migrationBuilder.DropCheckConstraint(
                name: "CK_DeletedTaskItems_SingleTimeValidation",
                table: "DeletedTaskItems");

            migrationBuilder.DropCheckConstraint(
                name: "CK_DeletedTaskItems_TimeRangeValidation",
                table: "DeletedTaskItems");

            migrationBuilder.DropCheckConstraint(
                name: "CK_DeletedTaskItems_TimeType_Valid",
                table: "DeletedTaskItems");

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
