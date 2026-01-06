using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BlotzTask.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddOnboardingEnums : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "OnboardingCompleted",
                table: "AppUsers");

            migrationBuilder.DropColumn(
                name: "OnboardingCurrentStepKey",
                table: "AppUsers");

            migrationBuilder.AddColumn<DateTime>(
                name: "OnboardingCompletedAt",
                table: "AppUsers",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "OnboardingStatus",
                table: "AppUsers",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "OnboardingStep",
                table: "AppUsers",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.UpdateData(
                table: "AppUsers",
                keyColumn: "Id",
                keyValue: new Guid("718ccb8f-ce52-4e51-8cfe-2a44cdca77d1"),
                columns: new[] { "OnboardingCompletedAt", "OnboardingStatus", "OnboardingStep" },
                values: new object[] { null, 0, 0 });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "OnboardingCompletedAt",
                table: "AppUsers");

            migrationBuilder.DropColumn(
                name: "OnboardingStatus",
                table: "AppUsers");

            migrationBuilder.DropColumn(
                name: "OnboardingStep",
                table: "AppUsers");

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
    }
}
