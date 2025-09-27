using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BlotzTask.Migrations
{
    /// <inheritdoc />
    public partial class MakeTimeTypeNullable : Migration
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

            migrationBuilder.AlterColumn<int>(
                name: "TimeType",
                table: "TaskItems",
                type: "int",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "int");

            migrationBuilder.AlterColumn<int>(
                name: "TimeType",
                table: "DeletedTaskItems",
                type: "int",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "int");

            migrationBuilder.AddCheckConstraint(
                name: "CK_TaskItems_TimeType_Valid",
                table: "TaskItems",
                sql: "([TimeType] IN (0,1)) OR ([StartTime] IS NULL AND [EndTime] IS NULL)");

            migrationBuilder.AddCheckConstraint(
                name: "CK_DeletedTaskItems_TimeType_Valid",
                table: "DeletedTaskItems",
                sql: "([TimeType] IN (0,1)) OR ([StartTime] IS NULL AND [EndTime] IS NULL)");
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

            migrationBuilder.AlterColumn<int>(
                name: "TimeType",
                table: "TaskItems",
                type: "int",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "int",
                oldNullable: true);

            migrationBuilder.AlterColumn<int>(
                name: "TimeType",
                table: "DeletedTaskItems",
                type: "int",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "int",
                oldNullable: true);

            migrationBuilder.AddCheckConstraint(
                name: "CK_TaskItems_TimeType_Valid",
                table: "TaskItems",
                sql: "[TimeType] IN (0,1)");

            migrationBuilder.AddCheckConstraint(
                name: "CK_DeletedTaskItems_TimeType_Valid",
                table: "DeletedTaskItems",
                sql: "[TimeType] IN (0,1)");
        }
    }
}
