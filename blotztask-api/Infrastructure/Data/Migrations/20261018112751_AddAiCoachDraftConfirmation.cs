using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BlotzTask.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddAiCoachDraftConfirmation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
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
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AiCoachDraftConfirmation");
        }
    }
}
