using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BlotzTask.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddAiCoachFeedbackAndTraceEvents : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AiCoachFeedback",
                columns: table => new
                {
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AssistantMessageId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ConversationId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TurnId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Rating = table.Column<string>(type: "nvarchar(8)", maxLength: 8, nullable: false),
                    Reason = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: true),
                    Detail = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AiCoachFeedback", x => new { x.UserId, x.AssistantMessageId });
                    table.ForeignKey(
                        name: "FK_AiCoachFeedback_AppUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AppUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AiCoachTraceEvent",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ConversationId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TurnId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    AssistantMessageId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    Kind = table.Column<string>(type: "nvarchar(48)", maxLength: 48, nullable: false),
                    Payload = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AiCoachTraceEvent", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AiCoachTraceEvent_AppUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AppUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AiCoachFeedback_Rating_UpdatedAt",
                table: "AiCoachFeedback",
                columns: new[] { "Rating", "UpdatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_AiCoachFeedback_UserId_ConversationId",
                table: "AiCoachFeedback",
                columns: new[] { "UserId", "ConversationId" });

            migrationBuilder.CreateIndex(
                name: "IX_AiCoachTraceEvent_AssistantMessageId",
                table: "AiCoachTraceEvent",
                column: "AssistantMessageId");

            migrationBuilder.CreateIndex(
                name: "IX_AiCoachTraceEvent_ConversationId_Id",
                table: "AiCoachTraceEvent",
                columns: new[] { "ConversationId", "Id" });

            migrationBuilder.CreateIndex(
                name: "IX_AiCoachTraceEvent_ConversationId_TurnId_Id",
                table: "AiCoachTraceEvent",
                columns: new[] { "ConversationId", "TurnId", "Id" });

            migrationBuilder.CreateIndex(
                name: "IX_AiCoachTraceEvent_CreatedAt",
                table: "AiCoachTraceEvent",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_AiCoachTraceEvent_UserId_ConversationId",
                table: "AiCoachTraceEvent",
                columns: new[] { "UserId", "ConversationId" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AiCoachFeedback");

            migrationBuilder.DropTable(
                name: "AiCoachTraceEvent");
        }
    }
}
