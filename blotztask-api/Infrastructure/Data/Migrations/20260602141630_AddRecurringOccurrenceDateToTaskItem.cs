using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BlotzTask.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddRecurringOccurrenceDateToTaskItem : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_TaskItems_RecurringTaskId",
                table: "TaskItems");

            migrationBuilder.AddColumn<DateOnly>(
                name: "RecurringOccurrenceDate",
                table: "TaskItems",
                type: "date",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_TaskItems_RecurringTaskId_RecurringOccurrenceDate",
                table: "TaskItems",
                columns: new[] { "RecurringTaskId", "RecurringOccurrenceDate" },
                unique: true,
                filter: "[RecurringTaskId] IS NOT NULL AND [RecurringOccurrenceDate] IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_TaskItems_RecurringTaskId_RecurringOccurrenceDate",
                table: "TaskItems");

            migrationBuilder.DropColumn(
                name: "RecurringOccurrenceDate",
                table: "TaskItems");

            migrationBuilder.CreateIndex(
                name: "IX_TaskItems_RecurringTaskId",
                table: "TaskItems",
                column: "RecurringTaskId");
        }
    }
}
