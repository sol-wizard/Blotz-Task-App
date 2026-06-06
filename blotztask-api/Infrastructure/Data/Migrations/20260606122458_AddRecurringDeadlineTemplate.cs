using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BlotzTask.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddRecurringDeadlineTemplate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "DeadlineOffsetDays",
                table: "RecurringTasks",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<TimeOnly>(
                name: "DeadlineTimeOfDay",
                table: "RecurringTasks",
                type: "time",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DeadlineTimeZoneId",
                table: "RecurringTasks",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsDeadline",
                table: "RecurringTasks",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddCheckConstraint(
                name: "CK_RecurringTask_Deadline_Offset_NonNegative",
                table: "RecurringTasks",
                sql: "([DeadlineOffsetDays] IS NULL OR [DeadlineOffsetDays] >= 0)");

            migrationBuilder.AddCheckConstraint(
                name: "CK_RecurringTask_Deadline_Template_Complete",
                table: "RecurringTasks",
                sql: "(([IsDeadline] = 0 AND [DeadlineOffsetDays] IS NULL AND [DeadlineTimeOfDay] IS NULL AND [DeadlineTimeZoneId] IS NULL) OR ([IsDeadline] = 1 AND [DeadlineOffsetDays] IS NOT NULL AND [DeadlineTimeOfDay] IS NOT NULL AND [DeadlineTimeZoneId] IS NOT NULL))");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_RecurringTask_Deadline_Offset_NonNegative",
                table: "RecurringTasks");

            migrationBuilder.DropCheckConstraint(
                name: "CK_RecurringTask_Deadline_Template_Complete",
                table: "RecurringTasks");

            migrationBuilder.DropColumn(
                name: "DeadlineOffsetDays",
                table: "RecurringTasks");

            migrationBuilder.DropColumn(
                name: "DeadlineTimeOfDay",
                table: "RecurringTasks");

            migrationBuilder.DropColumn(
                name: "DeadlineTimeZoneId",
                table: "RecurringTasks");

            migrationBuilder.DropColumn(
                name: "IsDeadline",
                table: "RecurringTasks");
        }
    }
}
