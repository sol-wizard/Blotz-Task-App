using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BlotzTask.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class ReplaceAiCoachSegmentIndexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_AiCoachMessage_ConversationId",
                table: "AiCoachMessage");

            migrationBuilder.DropIndex(
                name: "IX_AiCoachConversation_UserId_LastActivityAt",
                table: "AiCoachConversation");

            migrationBuilder.CreateIndex(
                name: "IX_AiCoachMessage_ConversationId_CreatedAt_Id",
                table: "AiCoachMessage",
                columns: new[] { "ConversationId", "CreatedAt", "Id" });

            migrationBuilder.CreateIndex(
                name: "IX_AiCoachConversation_UserId_EndedAt",
                table: "AiCoachConversation",
                columns: new[] { "UserId", "EndedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_AiCoachMessage_ConversationId_CreatedAt_Id",
                table: "AiCoachMessage");

            migrationBuilder.DropIndex(
                name: "IX_AiCoachConversation_UserId_EndedAt",
                table: "AiCoachConversation");

            migrationBuilder.CreateIndex(
                name: "IX_AiCoachMessage_ConversationId",
                table: "AiCoachMessage",
                column: "ConversationId");

            migrationBuilder.CreateIndex(
                name: "IX_AiCoachConversation_UserId_LastActivityAt",
                table: "AiCoachConversation",
                columns: new[] { "UserId", "LastActivityAt" });
        }
    }
}
