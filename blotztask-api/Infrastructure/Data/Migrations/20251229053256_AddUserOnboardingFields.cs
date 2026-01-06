using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BlotzTask.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddUserOnboardingFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "OnboardingCompleted",
                table: "AppUsers",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "OnboardingCurrentStepKey",
                table: "AppUsers",
                type: "nvarchar(max)",
                nullable: true,
                defaultValue: "tap_to_begin");

            migrationBuilder.UpdateData(
                table: "AppUsers",
                keyColumn: "Id",
                keyValue: new Guid("718ccb8f-ce52-4e51-8cfe-2a44cdca77d1"),
                column: "OnboardingCurrentStepKey",
                value: "tap_to_begin");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "OnboardingCompleted",
                table: "AppUsers");

            migrationBuilder.DropColumn(
                name: "OnboardingCurrentStepKey",
                table: "AppUsers");
        }
    }
}
