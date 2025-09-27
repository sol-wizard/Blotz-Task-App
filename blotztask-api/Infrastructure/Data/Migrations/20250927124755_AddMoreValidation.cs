using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BlotzTask.Migrations
{
    /// <inheritdoc />
    public partial class AddMoreValidation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_TaskItems_TimeType_Valid",
                table: "TaskItems");

            migrationBuilder.DropCheckConstraint(
                name: "CK_DeletedTaskItems_TimeType_Valid",
                table: "DeletedTaskItems");

            migrationBuilder.AddCheckConstraint(
                name: "CK_TaskItems_TimeType_Valid",
                table: "TaskItems",
                sql: "([TimeType] IN (0,1) AND ([StartTime] IS NOT NULL AND [EndTime] IS NOT NULL)) OR ([StartTime] IS NULL AND [EndTime] IS NULL)");

            migrationBuilder.AddCheckConstraint(
                name: "CK_DeletedTaskItems_TimeType_Valid",
                table: "DeletedTaskItems",
                sql: "([TimeType] IN (0,1) AND ([StartTime] IS NOT NULL AND [EndTime] IS NOT NULL)) OR ([StartTime] IS NULL AND [EndTime] IS NULL)");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_TaskItems_TimeType_Valid",
                table: "TaskItems");

            migrationBuilder.DropCheckConstraint(
                name: "CK_DeletedTaskItems_TimeType_Valid",
                table: "DeletedTaskItems");

            migrationBuilder.AddCheckConstraint(
                name: "CK_TaskItems_TimeType_Valid",
                table: "TaskItems",
                sql: "([TimeType] IN (0,1)) OR ([StartTime] IS NULL AND [EndTime] IS NULL)");

            migrationBuilder.AddCheckConstraint(
                name: "CK_DeletedTaskItems_TimeType_Valid",
                table: "DeletedTaskItems",
                sql: "([TimeType] IN (0,1)) OR ([StartTime] IS NULL AND [EndTime] IS NULL)");
        }
    }
}
