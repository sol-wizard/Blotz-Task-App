using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BlotzTask.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddAiCoachConversation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AiCoachConversation",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Mode = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Title = table.Column<string>(type: "nvarchar(60)", maxLength: 60, nullable: true),
                    LastMessagePreview = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: true),
                    MessageCount = table.Column<int>(type: "int", nullable: false),
                    HasPendingDraft = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    LastActivityAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    Revision = table.Column<int>(type: "int", nullable: false),
                    SchemaVersion = table.Column<int>(type: "int", nullable: false),
                    Payload = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AiCoachConversation", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AiCoachConversation_AppUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AppUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AiCoachConversation_LastActivityAt",
                table: "AiCoachConversation",
                column: "LastActivityAt");

            migrationBuilder.CreateIndex(
                name: "IX_AiCoachConversation_UserId_LastActivityAt",
                table: "AiCoachConversation",
                columns: new[] { "UserId", "LastActivityAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AiCoachConversation");
        }
    }
}
