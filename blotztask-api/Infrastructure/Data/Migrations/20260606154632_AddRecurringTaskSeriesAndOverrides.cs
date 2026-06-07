using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BlotzTask.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddRecurringTaskSeriesAndOverrides : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_TaskItems_RecurringTasks_RecurringTaskId",
                table: "TaskItems");

            migrationBuilder.DropIndex(
                name: "IX_TaskItems_RecurringTaskId_RecurringOccurrenceDate",
                table: "TaskItems");

            migrationBuilder.DropColumn(
                name: "RecurringOccurrenceDate",
                table: "TaskItems");

            migrationBuilder.RenameColumn(
                name: "RecurringTaskId",
                table: "TaskItems",
                newName: "RecurringOccurrenceOverrideId");

            migrationBuilder.AddColumn<int>(
                name: "PreviousRecurringTaskId",
                table: "RecurringTasks",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "SeriesId",
                table: "RecurringTasks",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateTable(
                name: "RecurringTaskSeries",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false, defaultValue: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RecurringTaskSeries", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RecurringTaskSeries_AppUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AppUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "RecurringOccurrenceOverrides",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    SeriesId = table.Column<int>(type: "int", nullable: false),
                    RecurringTaskId = table.Column<int>(type: "int", nullable: false),
                    OccurrenceDate = table.Column<DateOnly>(type: "date", nullable: false),
                    OverrideType = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RecurringOccurrenceOverrides", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RecurringOccurrenceOverrides_RecurringTaskSeries_SeriesId",
                        column: x => x.SeriesId,
                        principalTable: "RecurringTaskSeries",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_RecurringOccurrenceOverrides_RecurringTasks_RecurringTaskId",
                        column: x => x.RecurringTaskId,
                        principalTable: "RecurringTasks",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_TaskItems_RecurringOccurrenceOverrideId",
                table: "TaskItems",
                column: "RecurringOccurrenceOverrideId",
                unique: true,
                filter: "[RecurringOccurrenceOverrideId] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_RecurringTasks_PreviousRecurringTaskId",
                table: "RecurringTasks",
                column: "PreviousRecurringTaskId");

            migrationBuilder.CreateIndex(
                name: "IX_RecurringTasks_SeriesId_StartDate_EndDate",
                table: "RecurringTasks",
                columns: new[] { "SeriesId", "StartDate", "EndDate" });

            migrationBuilder.CreateIndex(
                name: "IX_RecurringOccurrenceOverrides_RecurringTaskId",
                table: "RecurringOccurrenceOverrides",
                column: "RecurringTaskId");

            migrationBuilder.CreateIndex(
                name: "IX_RecurringOccurrenceOverrides_SeriesId_OccurrenceDate",
                table: "RecurringOccurrenceOverrides",
                columns: new[] { "SeriesId", "OccurrenceDate" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_RecurringTaskSeries_UserId_IsDeleted",
                table: "RecurringTaskSeries",
                columns: new[] { "UserId", "IsDeleted" });

            migrationBuilder.AddForeignKey(
                name: "FK_RecurringTasks_RecurringTaskSeries_SeriesId",
                table: "RecurringTasks",
                column: "SeriesId",
                principalTable: "RecurringTaskSeries",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_RecurringTasks_RecurringTasks_PreviousRecurringTaskId",
                table: "RecurringTasks",
                column: "PreviousRecurringTaskId",
                principalTable: "RecurringTasks",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_TaskItems_RecurringOccurrenceOverrides_RecurringOccurrenceOverrideId",
                table: "TaskItems",
                column: "RecurringOccurrenceOverrideId",
                principalTable: "RecurringOccurrenceOverrides",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_RecurringTasks_RecurringTaskSeries_SeriesId",
                table: "RecurringTasks");

            migrationBuilder.DropForeignKey(
                name: "FK_RecurringTasks_RecurringTasks_PreviousRecurringTaskId",
                table: "RecurringTasks");

            migrationBuilder.DropForeignKey(
                name: "FK_TaskItems_RecurringOccurrenceOverrides_RecurringOccurrenceOverrideId",
                table: "TaskItems");

            migrationBuilder.DropTable(
                name: "RecurringOccurrenceOverrides");

            migrationBuilder.DropTable(
                name: "RecurringTaskSeries");

            migrationBuilder.DropIndex(
                name: "IX_TaskItems_RecurringOccurrenceOverrideId",
                table: "TaskItems");

            migrationBuilder.DropIndex(
                name: "IX_RecurringTasks_PreviousRecurringTaskId",
                table: "RecurringTasks");

            migrationBuilder.DropIndex(
                name: "IX_RecurringTasks_SeriesId_StartDate_EndDate",
                table: "RecurringTasks");

            migrationBuilder.DropColumn(
                name: "PreviousRecurringTaskId",
                table: "RecurringTasks");

            migrationBuilder.DropColumn(
                name: "SeriesId",
                table: "RecurringTasks");

            migrationBuilder.RenameColumn(
                name: "RecurringOccurrenceOverrideId",
                table: "TaskItems",
                newName: "RecurringTaskId");

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

            migrationBuilder.AddForeignKey(
                name: "FK_TaskItems_RecurringTasks_RecurringTaskId",
                table: "TaskItems",
                column: "RecurringTaskId",
                principalTable: "RecurringTasks",
                principalColumn: "Id");
        }
    }
}
