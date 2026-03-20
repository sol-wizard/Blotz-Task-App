using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BlotzTask.Migrations
{
    /// <inheritdoc />
    public partial class BackfillPomodoroSetting : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
            INSERT INTO [dbo].[PomodoroSettings] ([UserId], [Timing], [Sound], [IsCountdown])
            SELECT u.[Id], 25, NULL, 0
            FROM [dbo].[AppUsers] u
            LEFT JOIN [dbo].[PomodoroSettings] p ON p.[UserId] = u.[Id]
            WHERE p.[UserId] IS NULL;
            """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {

        }
    }
}
