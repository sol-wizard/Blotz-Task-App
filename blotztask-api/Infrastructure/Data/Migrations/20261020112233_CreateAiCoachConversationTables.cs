using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BlotzTask.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class CreateAiCoachConversationTables : Migration
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
                    MessageCount = table.Column<int>(type: "int", nullable: false),
                    EndedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    ClosingSummary = table.Column<string>(type: "nvarchar(max)", nullable: true),
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

            migrationBuilder.CreateTable(
                name: "AiCoachDraftConfirmation",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ConversationId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DraftId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CommandId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RequestHash = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    SavedDraftJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AiCoachDraftConfirmation", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AiCoachDraftConfirmation_AiCoachConversation_ConversationId",
                        column: x => x.ConversationId,
                        principalTable: "AiCoachConversation",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

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
                name: "IX_AiCoachConversation_LastActivityAt",
                table: "AiCoachConversation",
                column: "LastActivityAt");

            migrationBuilder.CreateIndex(
                name: "IX_AiCoachConversation_UserId",
                table: "AiCoachConversation",
                column: "UserId",
                unique: true,
                filter: "[EndedAt] IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_AiCoachConversation_UserId_LastActivityAt",
                table: "AiCoachConversation",
                columns: new[] { "UserId", "LastActivityAt" });

            migrationBuilder.CreateIndex(
                name: "IX_AiCoachDraftConfirmation_ConversationId_DraftId",
                table: "AiCoachDraftConfirmation",
                columns: new[] { "ConversationId", "DraftId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AiCoachDraftConfirmation_UserId_CommandId",
                table: "AiCoachDraftConfirmation",
                columns: new[] { "UserId", "CommandId" },
                unique: true);

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
                name: "AiCoachDraftConfirmation");

            migrationBuilder.DropTable(
                name: "AiCoachMessage");

            migrationBuilder.DropTable(
                name: "AiCoachConversation");
        }
    }
}
