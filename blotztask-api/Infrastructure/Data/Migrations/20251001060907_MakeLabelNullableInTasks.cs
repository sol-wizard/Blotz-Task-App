using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BlotzTask.Migrations
{
    /// <inheritdoc />
    public partial class MakeLabelNullableInTasks : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_DeletedTaskItems_Labels_LabelId",
                table: "DeletedTaskItems");

            migrationBuilder.DropForeignKey(
                name: "FK_TaskItems_Labels_LabelId",
                table: "TaskItems");

            migrationBuilder.AlterColumn<int>(
                name: "LabelId",
                table: "TaskItems",
                type: "int",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "int");

            migrationBuilder.AlterColumn<int>(
                name: "LabelId",
                table: "DeletedTaskItems",
                type: "int",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "int");

            migrationBuilder.AddForeignKey(
                name: "FK_DeletedTaskItems_Labels_LabelId",
                table: "DeletedTaskItems",
                column: "LabelId",
                principalTable: "Labels",
                principalColumn: "LabelId");

            migrationBuilder.AddForeignKey(
                name: "FK_TaskItems_Labels_LabelId",
                table: "TaskItems",
                column: "LabelId",
                principalTable: "Labels",
                principalColumn: "LabelId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_DeletedTaskItems_Labels_LabelId",
                table: "DeletedTaskItems");

            migrationBuilder.DropForeignKey(
                name: "FK_TaskItems_Labels_LabelId",
                table: "TaskItems");

            migrationBuilder.AlterColumn<int>(
                name: "LabelId",
                table: "TaskItems",
                type: "int",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "int",
                oldNullable: true);

            migrationBuilder.AlterColumn<int>(
                name: "LabelId",
                table: "DeletedTaskItems",
                type: "int",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "int",
                oldNullable: true);

            migrationBuilder.AddForeignKey(
                name: "FK_DeletedTaskItems_Labels_LabelId",
                table: "DeletedTaskItems",
                column: "LabelId",
                principalTable: "Labels",
                principalColumn: "LabelId",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_TaskItems_Labels_LabelId",
                table: "TaskItems",
                column: "LabelId",
                principalTable: "Labels",
                principalColumn: "LabelId",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
