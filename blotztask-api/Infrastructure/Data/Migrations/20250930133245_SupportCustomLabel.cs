using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BlotzTask.Migrations
{
    /// <inheritdoc />
    public partial class SupportCustomLabel : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Scope",
                table: "Labels",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<Guid>(
                name: "UserId",
                table: "Labels",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.UpdateData(
                table: "Labels",
                keyColumn: "LabelId",
                keyValue: 6,
                columns: new[] { "Scope", "UserId" },
                values: new object[] { "Global", null });

            migrationBuilder.UpdateData(
                table: "Labels",
                keyColumn: "LabelId",
                keyValue: 7,
                columns: new[] { "Scope", "UserId" },
                values: new object[] { "Global", null });

            migrationBuilder.UpdateData(
                table: "Labels",
                keyColumn: "LabelId",
                keyValue: 8,
                columns: new[] { "Scope", "UserId" },
                values: new object[] { "Global", null });

            migrationBuilder.UpdateData(
                table: "Labels",
                keyColumn: "LabelId",
                keyValue: 9,
                columns: new[] { "Scope", "UserId" },
                values: new object[] { "Global", null });

            migrationBuilder.CreateIndex(
                name: "IX_Labels_UserId",
                table: "Labels",
                column: "UserId");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Label_Scope_User",
                table: "Labels",
                sql: "(Scope = 'Global' AND UserId IS NULL) OR (Scope = 'Custom' AND UserId IS NOT NULL)");

            migrationBuilder.AddForeignKey(
                name: "FK_Labels_AppUsers_UserId",
                table: "Labels",
                column: "UserId",
                principalTable: "AppUsers",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Labels_AppUsers_UserId",
                table: "Labels");

            migrationBuilder.DropIndex(
                name: "IX_Labels_UserId",
                table: "Labels");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Label_Scope_User",
                table: "Labels");

            migrationBuilder.DropColumn(
                name: "Scope",
                table: "Labels");

            migrationBuilder.DropColumn(
                name: "UserId",
                table: "Labels");
        }
    }
}
