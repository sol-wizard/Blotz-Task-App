using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BlotzTask.Migrations
{
    /// <inheritdoc />
    public partial class RestructureTaskItemNullableFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_DeletedTaskItems_Labels_LabelId",
                table: "DeletedTaskItems");

            migrationBuilder.AlterColumn<int>(
                name: "LabelId",
                table: "DeletedTaskItems",
                type: "int",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "int");

            migrationBuilder.AlterColumn<bool>(
                name: "HasTime",
                table: "DeletedTaskItems",
                type: "bit",
                nullable: true,
                oldClrType: typeof(bool),
                oldType: "bit");

            migrationBuilder.AlterColumn<string>(
                name: "Description",
                table: "DeletedTaskItems",
                type: "nvarchar(max)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AddForeignKey(
                name: "FK_DeletedTaskItems_Labels_LabelId",
                table: "DeletedTaskItems",
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

            migrationBuilder.AlterColumn<int>(
                name: "LabelId",
                table: "DeletedTaskItems",
                type: "int",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "int",
                oldNullable: true);

            migrationBuilder.AlterColumn<bool>(
                name: "HasTime",
                table: "DeletedTaskItems",
                type: "bit",
                nullable: false,
                defaultValue: false,
                oldClrType: typeof(bool),
                oldType: "bit",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Description",
                table: "DeletedTaskItems",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "nvarchar(max)",
                oldNullable: true);

            migrationBuilder.AddForeignKey(
                name: "FK_DeletedTaskItems_Labels_LabelId",
                table: "DeletedTaskItems",
                column: "LabelId",
                principalTable: "Labels",
                principalColumn: "LabelId",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
