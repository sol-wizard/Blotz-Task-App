using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BlotzTask.Migrations
{
    /// <inheritdoc />
    public partial class AddTimeTypeConstraints : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddCheckConstraint(
                name: "CK_TaskItem_SingleTime_Equals",
                table: "TaskItems",
                sql: "([TimeType] IS NULL) OR ([TimeType] <> 0) OR ([StartTime] = [EndTime])");

            migrationBuilder.AddCheckConstraint(
                name: "CK_TaskItem_Start_Before_Or_Equal_End",
                table: "TaskItems",
                sql: "([StartTime] IS NULL AND [EndTime] IS NULL) OR ([StartTime] <= [EndTime])");

            migrationBuilder.AddCheckConstraint(
                name: "CK_TaskItem_Time_Valid",
                table: "TaskItems",
                sql: "(  ([TimeType] IS NULL AND [StartTime] IS NULL AND [EndTime] IS NULL)   OR  ([TimeType] IS NOT NULL AND [StartTime] IS NOT NULL AND [EndTime] IS NOT NULL))");

            migrationBuilder.AddCheckConstraint(
                name: "CK_DeletedTaskItem_SingleTime_Equals",
                table: "DeletedTaskItems",
                sql: "([TimeType] IS NULL) OR ([TimeType] <> 0) OR ([StartTime] = [EndTime])");

            migrationBuilder.AddCheckConstraint(
                name: "CK_DeletedTaskItem_Start_Before_Or_Equal_End",
                table: "DeletedTaskItems",
                sql: "([StartTime] IS NULL AND [EndTime] IS NULL) OR ([StartTime] <= [EndTime])");

            migrationBuilder.AddCheckConstraint(
                name: "CK_DeletedTaskItem_Time_Valid",
                table: "DeletedTaskItems",
                sql: "(  ([TimeType] IS NULL AND [StartTime] IS NULL AND [EndTime] IS NULL)   OR  ([TimeType] IS NOT NULL AND [StartTime] IS NOT NULL AND [EndTime] IS NOT NULL))");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_TaskItem_SingleTime_Equals",
                table: "TaskItems");

            migrationBuilder.DropCheckConstraint(
                name: "CK_TaskItem_Start_Before_Or_Equal_End",
                table: "TaskItems");

            migrationBuilder.DropCheckConstraint(
                name: "CK_TaskItem_Time_Valid",
                table: "TaskItems");

            migrationBuilder.DropCheckConstraint(
                name: "CK_DeletedTaskItem_SingleTime_Equals",
                table: "DeletedTaskItems");

            migrationBuilder.DropCheckConstraint(
                name: "CK_DeletedTaskItem_Start_Before_Or_Equal_End",
                table: "DeletedTaskItems");

            migrationBuilder.DropCheckConstraint(
                name: "CK_DeletedTaskItem_Time_Valid",
                table: "DeletedTaskItems");
        }
    }
}
