using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BlotzTask.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AllowRecurringOverridePerTemplateOccurrence : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_RecurringOccurrenceOverrides_RecurringTaskId",
                table: "RecurringOccurrenceOverrides");

            migrationBuilder.DropIndex(
                name: "IX_RecurringOccurrenceOverrides_SeriesId_OccurrenceDate",
                table: "RecurringOccurrenceOverrides");

            migrationBuilder.CreateIndex(
                name: "IX_RecurringOccurrenceOverrides_RecurringTaskId_OccurrenceDate",
                table: "RecurringOccurrenceOverrides",
                columns: new[] { "RecurringTaskId", "OccurrenceDate" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_RecurringOccurrenceOverrides_SeriesId",
                table: "RecurringOccurrenceOverrides",
                column: "SeriesId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_RecurringOccurrenceOverrides_RecurringTaskId_OccurrenceDate",
                table: "RecurringOccurrenceOverrides");

            migrationBuilder.DropIndex(
                name: "IX_RecurringOccurrenceOverrides_SeriesId",
                table: "RecurringOccurrenceOverrides");

            migrationBuilder.CreateIndex(
                name: "IX_RecurringOccurrenceOverrides_RecurringTaskId",
                table: "RecurringOccurrenceOverrides",
                column: "RecurringTaskId");

            migrationBuilder.CreateIndex(
                name: "IX_RecurringOccurrenceOverrides_SeriesId_OccurrenceDate",
                table: "RecurringOccurrenceOverrides",
                columns: new[] { "SeriesId", "OccurrenceDate" },
                unique: true);
        }
    }
}
