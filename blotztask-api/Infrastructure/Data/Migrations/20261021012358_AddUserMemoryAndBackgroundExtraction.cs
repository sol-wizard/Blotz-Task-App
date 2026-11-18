using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BlotzTask.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddUserMemoryAndBackgroundExtraction : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "AiMemoryEnabled",
                table: "UserPreferences",
                type: "bit",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "MemoryProcessedAt",
                table: "AiCoachConversation",
                type: "datetimeoffset",
                nullable: false,
                defaultValueSql: "SYSDATETIMEOFFSET()");

            migrationBuilder.CreateTable(
                name: "UserMemories",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Kind = table.Column<string>(type: "nvarchar(24)", maxLength: 24, nullable: false),
                    Scope = table.Column<string>(type: "nvarchar(16)", maxLength: 16, nullable: false),
                    Content = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    ContentHash = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    Source = table.Column<string>(type: "nvarchar(24)", maxLength: 24, nullable: false),
                    SourceMessageId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    EvidenceExcerpt = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    Status = table.Column<string>(type: "nvarchar(16)", maxLength: 16, nullable: false),
                    SupersededById = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    ValidUntil = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    LastConfirmedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserMemories", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UserMemories_AppUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AppUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.UpdateData(
                table: "UserPreferences",
                keyColumn: "UserId",
                keyValue: new Guid("718ccb8f-ce52-4e51-8cfe-2a44cdca77d1"),
                column: "AiMemoryEnabled",
                value: true);

            migrationBuilder.CreateIndex(
                name: "IX_UserMemories_UserId_ContentHash",
                table: "UserMemories",
                columns: new[] { "UserId", "ContentHash" });

            migrationBuilder.CreateIndex(
                name: "IX_UserMemories_UserId_Status",
                table: "UserMemories",
                columns: new[] { "UserId", "Status" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "UserMemories");

            migrationBuilder.DropColumn(
                name: "AiMemoryEnabled",
                table: "UserPreferences");

            migrationBuilder.DropColumn(
                name: "MemoryProcessedAt",
                table: "AiCoachConversation");
        }
    }
}
