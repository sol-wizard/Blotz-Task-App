using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BlotzTask.Migrations
{
    /// <inheritdoc />
    public partial class AddRecurringTaskTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "RecurringTaskId",
                table: "TaskItems",
                type: "int",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "RecurringTasks",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    TimeType = table.Column<int>(type: "int", nullable: false),
                    LabelId = table.Column<int>(type: "int", nullable: true),
                    TemplateStartTime = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    TemplateEndTime = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    Frequency = table.Column<int>(type: "int", nullable: false),
                    Interval = table.Column<int>(type: "int", nullable: false, defaultValue: 1),
                    DaysOfWeek = table.Column<int>(type: "int", nullable: true),
                    DayOfMonth = table.Column<int>(type: "int", nullable: true),
                    StartDate = table.Column<DateOnly>(type: "date", nullable: false),
                    EndDate = table.Column<DateOnly>(type: "date", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false, defaultValue: true),
                    GeneratedUpTo = table.Column<DateOnly>(type: "date", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RecurringTasks", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RecurringTasks_AppUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AppUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_RecurringTasks_Labels_LabelId",
                        column: x => x.LabelId,
                        principalTable: "Labels",
                        principalColumn: "LabelId");
                });

            migrationBuilder.CreateIndex(
                name: "IX_TaskItems_RecurringTaskId",
                table: "TaskItems",
                column: "RecurringTaskId");

            migrationBuilder.CreateIndex(
                name: "IX_RecurringTasks_LabelId",
                table: "RecurringTasks",
                column: "LabelId");

            migrationBuilder.CreateIndex(
                name: "IX_RecurringTasks_UserId_IsActive",
                table: "RecurringTasks",
                columns: new[] { "UserId", "IsActive" });

            migrationBuilder.AddForeignKey(
                name: "FK_TaskItems_RecurringTasks_RecurringTaskId",
                table: "TaskItems",
                column: "RecurringTaskId",
                principalTable: "RecurringTasks",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_TaskItems_RecurringTasks_RecurringTaskId",
                table: "TaskItems");

            migrationBuilder.DropTable(
                name: "RecurringTasks");

            migrationBuilder.DropIndex(
                name: "IX_TaskItems_RecurringTaskId",
                table: "TaskItems");

            migrationBuilder.DropColumn(
                name: "RecurringTaskId",
                table: "TaskItems");
        }
    }
}
