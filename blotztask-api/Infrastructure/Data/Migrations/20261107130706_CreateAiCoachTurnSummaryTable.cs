using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BlotzTask.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class CreateAiCoachTurnSummaryTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AiCoachTurnSummary",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ConversationId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TurnId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    Kind = table.Column<string>(type: "varchar(16)", unicode: false, maxLength: 16, nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    Source = table.Column<string>(type: "varchar(16)", unicode: false, maxLength: 16, nullable: true),
                    Model = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: true),
                    DeploymentId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: true),
                    Api = table.Column<string>(type: "varchar(32)", unicode: false, maxLength: 32, nullable: true),
                    PromptVersion = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: true),
                    ToolContractVersion = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: true),
                    ErrorCode = table.Column<string>(type: "varchar(64)", unicode: false, maxLength: 64, nullable: true),
                    CommitStatus = table.Column<string>(type: "varchar(32)", unicode: false, maxLength: 32, nullable: true),
                    ModelCallCount = table.Column<int>(type: "int", nullable: false),
                    ToolCallCount = table.Column<int>(type: "int", nullable: false),
                    ToolNames = table.Column<string>(type: "varchar(1000)", unicode: false, maxLength: 1000, nullable: true),
                    InputTokens = table.Column<int>(type: "int", nullable: false),
                    CachedInputTokens = table.Column<int>(type: "int", nullable: false),
                    OutputTokens = table.Column<int>(type: "int", nullable: false),
                    TotalTokens = table.Column<int>(type: "int", nullable: false),
                    EstimatedUsd = table.Column<decimal>(type: "decimal(18,8)", precision: 18, scale: 8, nullable: true),
                    DurationMs = table.Column<long>(type: "bigint", nullable: false),
                    DraftId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    DraftItemCount = table.Column<int>(type: "int", nullable: true),
                    DraftUserEditCount = table.Column<int>(type: "int", nullable: false),
                    DraftOutcome = table.Column<string>(type: "varchar(16)", unicode: false, maxLength: 16, nullable: true),
                    DraftSavedItemCount = table.Column<int>(type: "int", nullable: true),
                    DraftOutcomeAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AiCoachTurnSummary", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AiCoachTurnSummary_AppUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AppUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AiCoachTurnSummary_CreatedAt",
                table: "AiCoachTurnSummary",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_AiCoachTurnSummary_DraftId",
                table: "AiCoachTurnSummary",
                column: "DraftId");

            migrationBuilder.CreateIndex(
                name: "IX_AiCoachTurnSummary_TurnId",
                table: "AiCoachTurnSummary",
                column: "TurnId");

            migrationBuilder.CreateIndex(
                name: "IX_AiCoachTurnSummary_UserId_CreatedAt",
                table: "AiCoachTurnSummary",
                columns: new[] { "UserId", "CreatedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AiCoachTurnSummary");
        }
    }
}
