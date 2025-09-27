using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BlotzTask.Migrations
{
    /// <inheritdoc />
    public partial class RefineValidationRules : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
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

            // 1) 没有 TimeType 的任务：Start/End 必须都为空
            migrationBuilder.Sql(@"
            UPDATE t
            SET StartTime = NULL,
                EndTime   = NULL
            FROM dbo.TaskItems t
            WHERE t.TimeType IS NULL
            AND (t.StartTime IS NOT NULL OR t.EndTime IS NOT NULL);
            ");

            // 2) 有些数据可能 Start/End 都为空但 TimeType 仍然有值；应把 TimeType 置空
            migrationBuilder.Sql(@"
            UPDATE t
            SET TimeType = NULL
            FROM dbo.TaskItems t
            WHERE t.TimeType IS NOT NULL
            AND t.StartTime IS NULL
            AND t.EndTime   IS NULL;
            ");

            migrationBuilder.AddCheckConstraint(
                name: "CK_TaskItems_SingleTime_Equals",
                table: "TaskItems",
                sql: "([TimeType] IS NULL) OR ([TimeType] <> 0) OR ([StartTime] = [EndTime])");

            migrationBuilder.AddCheckConstraint(
                name: "CK_TaskItems_Start_Before_Or_Equal_End",
                table: "TaskItems",
                sql: "([StartTime] IS NULL AND [EndTime] IS NULL) OR ([StartTime] <= [EndTime])");

            migrationBuilder.AddCheckConstraint(
                name: "CK_TaskItems_Time_Presence",
                table: "TaskItems",
                sql: "(  ([TimeType] IS NULL AND [StartTime] IS NULL AND [EndTime] IS NULL)   OR  ([TimeType] IN (0,1) AND [StartTime] IS NOT NULL AND [EndTime] IS NOT NULL))");

            migrationBuilder.AddCheckConstraint(
                name: "CK_DeletedTaskItems_SingleTime_Equals",
                table: "DeletedTaskItems",
                sql: "([TimeType] IS NULL) OR ([TimeType] <> 0) OR ([StartTime] = [EndTime])");

            migrationBuilder.AddCheckConstraint(
                name: "CK_DeletedTaskItems_Start_Before_Or_Equal_End",
                table: "DeletedTaskItems",
                sql: "([StartTime] IS NULL AND [EndTime] IS NULL) OR ([StartTime] <= [EndTime])");

            migrationBuilder.AddCheckConstraint(
                name: "CK_DeletedTaskItems_Time_Presence",
                table: "DeletedTaskItems",
                sql: "(  ([TimeType] IS NULL AND [StartTime] IS NULL AND [EndTime] IS NULL)   OR  ([TimeType] IN (0,1) AND [StartTime] IS NOT NULL AND [EndTime] IS NOT NULL))");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_TaskItems_SingleTime_Equals",
                table: "TaskItems");

            migrationBuilder.DropCheckConstraint(
                name: "CK_TaskItems_Start_Before_Or_Equal_End",
                table: "TaskItems");

            migrationBuilder.DropCheckConstraint(
                name: "CK_TaskItems_Time_Presence",
                table: "TaskItems");

            migrationBuilder.DropCheckConstraint(
                name: "CK_DeletedTaskItems_SingleTime_Equals",
                table: "DeletedTaskItems");

            migrationBuilder.DropCheckConstraint(
                name: "CK_DeletedTaskItems_Start_Before_Or_Equal_End",
                table: "DeletedTaskItems");

            migrationBuilder.DropCheckConstraint(
                name: "CK_DeletedTaskItems_Time_Presence",
                table: "DeletedTaskItems");

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
                sql: "([TimeType] IN (0,1) AND ([StartTime] IS NOT NULL AND [EndTime] IS NOT NULL)) OR ([StartTime] IS NULL AND [EndTime] IS NULL)");

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
                sql: "([TimeType] IN (0,1) AND ([StartTime] IS NOT NULL AND [EndTime] IS NOT NULL)) OR ([StartTime] IS NULL AND [EndTime] IS NULL)");
        }
    }
}
