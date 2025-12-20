using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BlotzTask.Migrations
{
    /// <inheritdoc />
    public partial class UpdateUserPreferenceDefaults : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<bool>(
                name: "OverdueNotification",
                table: "UserPreferences",
                type: "bit",
                nullable: false,
                defaultValue: true,
                oldClrType: typeof(bool),
                oldType: "bit",
                oldDefaultValue: false);

            migrationBuilder.AlterColumn<bool>(
                name: "EveningWrapUpNotification",
                table: "UserPreferences",
                type: "bit",
                nullable: false,
                defaultValue: false,
                oldClrType: typeof(bool),
                oldType: "bit",
                oldDefaultValue: true);

            migrationBuilder.AlterColumn<bool>(
                name: "DailyPlanningNotification",
                table: "UserPreferences",
                type: "bit",
                nullable: false,
                defaultValue: false,
                oldClrType: typeof(bool),
                oldType: "bit",
                oldDefaultValue: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<bool>(
                name: "OverdueNotification",
                table: "UserPreferences",
                type: "bit",
                nullable: false,
                defaultValue: false,
                oldClrType: typeof(bool),
                oldType: "bit",
                oldDefaultValue: true);

            migrationBuilder.AlterColumn<bool>(
                name: "EveningWrapUpNotification",
                table: "UserPreferences",
                type: "bit",
                nullable: false,
                defaultValue: true,
                oldClrType: typeof(bool),
                oldType: "bit",
                oldDefaultValue: false);

            migrationBuilder.AlterColumn<bool>(
                name: "DailyPlanningNotification",
                table: "UserPreferences",
                type: "bit",
                nullable: false,
                defaultValue: true,
                oldClrType: typeof(bool),
                oldType: "bit",
                oldDefaultValue: false);
        }
    }
}
