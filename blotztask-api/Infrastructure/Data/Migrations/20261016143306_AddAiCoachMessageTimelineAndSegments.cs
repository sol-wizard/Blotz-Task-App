using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BlotzTask.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddAiCoachMessageTimelineAndSegments : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Version 1 contains disposable pre-release payloads; feedback is retained separately.
            migrationBuilder.Sql("DELETE FROM [AiCoachConversation] WHERE [SchemaVersion] = 1;");

            migrationBuilder.DropColumn(
                name: "HasPendingDraft",
                table: "AiCoachConversation");

            migrationBuilder.DropColumn(
                name: "LastMessagePreview",
                table: "AiCoachConversation");

            migrationBuilder.DropColumn(
                name: "Title",
                table: "AiCoachConversation");

            migrationBuilder.AddColumn<string>(
                name: "ClosingSummary",
                table: "AiCoachConversation",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "EndedAt",
                table: "AiCoachConversation",
                type: "datetimeoffset",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "AiCoachMessage",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ConversationId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Role = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Content = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    TaskContextRead = table.Column<bool>(type: "bit", nullable: false),
                    TurnId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    DraftSnapshot = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AiCoachMessage", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AiCoachMessage_AiCoachConversation_ConversationId",
                        column: x => x.ConversationId,
                        principalTable: "AiCoachConversation",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AiCoachConversation_UserId",
                table: "AiCoachConversation",
                column: "UserId",
                unique: true,
                filter: "[EndedAt] IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_AiCoachMessage_ConversationId",
                table: "AiCoachMessage",
                column: "ConversationId");

            migrationBuilder.CreateIndex(
                name: "IX_AiCoachMessage_CreatedAt",
                table: "AiCoachMessage",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_AiCoachMessage_UserId_CreatedAt_Id",
                table: "AiCoachMessage",
                columns: new[] { "UserId", "CreatedAt", "Id" },
                descending: new[] { false, true, true });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AiCoachMessage");

            migrationBuilder.DropIndex(
                name: "IX_AiCoachConversation_UserId",
                table: "AiCoachConversation");

            migrationBuilder.DropColumn(
                name: "ClosingSummary",
                table: "AiCoachConversation");

            migrationBuilder.DropColumn(
                name: "EndedAt",
                table: "AiCoachConversation");

            migrationBuilder.AddColumn<bool>(
                name: "HasPendingDraft",
                table: "AiCoachConversation",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "LastMessagePreview",
                table: "AiCoachConversation",
                type: "nvarchar(120)",
                maxLength: 120,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Title",
                table: "AiCoachConversation",
                type: "nvarchar(60)",
                maxLength: 60,
                nullable: true);
        }
    }
}
