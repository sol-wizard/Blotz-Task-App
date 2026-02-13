using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BlotzTask.Migrations
{
    /// <inheritdoc />
    public partial class AddCascadeDeletesForUserRelations : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Labels_AppUsers_UserId",
                table: "Labels");

            migrationBuilder.AddForeignKey(
                name: "FK_Labels_AppUsers_UserId",
                table: "Labels",
                column: "UserId",
                principalTable: "AppUsers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_UserPreferences_AppUsers_UserId",
                table: "UserPreferences",
                column: "UserId",
                principalTable: "AppUsers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Labels_AppUsers_UserId",
                table: "Labels");

            migrationBuilder.DropForeignKey(
                name: "FK_UserPreferences_AppUsers_UserId",
                table: "UserPreferences");

            migrationBuilder.AddForeignKey(
                name: "FK_Labels_AppUsers_UserId",
                table: "Labels",
                column: "UserId",
                principalTable: "AppUsers",
                principalColumn: "Id");
        }
    }
}
