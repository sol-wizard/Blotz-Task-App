using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BlotzTask.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class ReplaceBadgeNameDescriptionWithBilingual : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "Name",
                table: "Badges",
                newName: "NameZh");

            migrationBuilder.RenameColumn(
                name: "Description",
                table: "Badges",
                newName: "DescriptionZh");

            migrationBuilder.AddColumn<string>(
                name: "DescriptionEn",
                table: "Badges",
                type: "nvarchar(1000)",
                maxLength: 1000,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "NameEn",
                table: "Badges",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DescriptionEn",
                table: "Badges");

            migrationBuilder.DropColumn(
                name: "NameEn",
                table: "Badges");

            migrationBuilder.RenameColumn(
                name: "NameZh",
                table: "Badges",
                newName: "Name");

            migrationBuilder.RenameColumn(
                name: "DescriptionZh",
                table: "Badges",
                newName: "Description");
        }
    }
}
