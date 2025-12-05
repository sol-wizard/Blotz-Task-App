using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BlotzTask.Migrations
{
    /// <inheritdoc />
    public partial class AddTaskItemDateIndex : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_TaskItems_UserId",
                table: "TaskItems");

            migrationBuilder.CreateIndex(
                name: "IX_TaskItems_UserId_StartTime_EndTime",
                table: "TaskItems",
                columns: new[] { "UserId", "StartTime", "EndTime" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_TaskItems_UserId_StartTime_EndTime",
                table: "TaskItems");

            migrationBuilder.CreateIndex(
                name: "IX_TaskItems_UserId",
                table: "TaskItems",
                column: "UserId");
        }
    }
}
