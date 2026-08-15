using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BlotzTask.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class CreateAiCoachFoundation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AiConversationArtifacts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ConversationId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ArtifactType = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    SchemaVersion = table.Column<int>(type: "int", nullable: false),
                    Version = table.Column<int>(type: "int", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    CreatedByEffectId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    SupersedesArtifactId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    ExpiresAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AiConversationArtifacts", x => x.Id);
                    table.UniqueConstraint("AK_AiConversationArtifacts_Id_ConversationId", x => new { x.Id, x.ConversationId });
                    table.ForeignKey(
                        name: "FK_AiConversationArtifacts_AiConversationArtifacts_SupersedesArtifactId_ConversationId",
                        columns: x => new { x.SupersedesArtifactId, x.ConversationId },
                        principalTable: "AiConversationArtifacts",
                        principalColumns: new[] { "Id", "ConversationId" });
                });

            migrationBuilder.CreateTable(
                name: "AiConversations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Mode = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    LifecycleStatus = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    State = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    GenerationStatus = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    BlockedReason = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: true),
                    Version = table.Column<int>(type: "int", nullable: false),
                    LastTurnNumber = table.Column<int>(type: "int", nullable: false),
                    CurrentArtifactId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    ActiveConversationSlot = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    RuleVersion = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    PromptVersion = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    ModelDeploymentPolicyVersion = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    ExecutionFrameVersion = table.Column<int>(type: "int", nullable: false),
                    ToolsetVersion = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    SummarySchemaVersion = table.Column<int>(type: "int", nullable: false),
                    MemoryProfileId = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    MemoryProfileVersion = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    ExpiresAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AiConversations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AiConversations_AiConversationArtifacts_CurrentArtifactId_Id",
                        columns: x => new { x.CurrentArtifactId, x.Id },
                        principalTable: "AiConversationArtifacts",
                        principalColumns: new[] { "Id", "ConversationId" });
                    table.ForeignKey(
                        name: "FK_AiConversations_AppUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AppUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AiTaskDraftArtifacts",
                columns: table => new
                {
                    ArtifactId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Kind = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Title = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: true),
                    StartTimeUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    EndTimeUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    TimeZoneId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    StartDateLocal = table.Column<DateOnly>(type: "date", nullable: false),
                    EndDateLocal = table.Column<DateOnly>(type: "date", nullable: false),
                    LabelId = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AiTaskDraftArtifacts", x => x.ArtifactId);
                    table.CheckConstraint("CK_AiTaskDraftArtifacts_EndAfterStart", "[EndTimeUtc] > [StartTimeUtc]");
                    table.ForeignKey(
                        name: "FK_AiTaskDraftArtifacts_AiConversationArtifacts_ArtifactId",
                        column: x => x.ArtifactId,
                        principalTable: "AiConversationArtifacts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AiConversationEffects",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ConversationId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    BaseConversationVersion = table.Column<int>(type: "int", nullable: false),
                    Type = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                    SchemaVersion = table.Column<int>(type: "int", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    IdempotencyKey = table.Column<string>(type: "nvarchar(160)", maxLength: 160, nullable: false),
                    AttemptCount = table.Column<int>(type: "int", nullable: false),
                    StartedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    CompletedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    LeaseExpiresAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    LastErrorCode = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AiConversationEffects", x => x.Id);
                    table.UniqueConstraint("AK_AiConversationEffects_Id_ConversationId", x => new { x.Id, x.ConversationId });
                    table.CheckConstraint("CK_AiConversationEffects_AttemptCount", "[AttemptCount] >= 0");
                    table.CheckConstraint("CK_AiConversationEffects_RunningLease", "[Status] <> 'Running' OR [LeaseExpiresAt] IS NOT NULL");
                    table.CheckConstraint("CK_AiConversationEffects_TerminalCompletedAt", "[Status] NOT IN ('Completed', 'Failed', 'Superseded') OR [CompletedAt] IS NOT NULL");
                    table.ForeignKey(
                        name: "FK_AiConversationEffects_AiConversations_ConversationId",
                        column: x => x.ConversationId,
                        principalTable: "AiConversations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AiConversationMessages",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ConversationId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TurnNumber = table.Column<int>(type: "int", nullable: false),
                    Sequence = table.Column<int>(type: "int", nullable: false),
                    Role = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Content = table.Column<string>(type: "nvarchar(max)", maxLength: 10000, nullable: false),
                    ArtifactId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AiConversationMessages", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AiConversationMessages_AiConversationArtifacts_ArtifactId_ConversationId",
                        columns: x => new { x.ArtifactId, x.ConversationId },
                        principalTable: "AiConversationArtifacts",
                        principalColumns: new[] { "Id", "ConversationId" });
                    table.ForeignKey(
                        name: "FK_AiConversationMessages_AiConversations_ConversationId",
                        column: x => x.ConversationId,
                        principalTable: "AiConversations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AiConversationArtifacts_CreatedByEffectId_ConversationId",
                table: "AiConversationArtifacts",
                columns: new[] { "CreatedByEffectId", "ConversationId" });

            migrationBuilder.CreateIndex(
                name: "IX_AiConversationArtifacts_SupersedesArtifactId_ConversationId",
                table: "AiConversationArtifacts",
                columns: new[] { "SupersedesArtifactId", "ConversationId" });

            migrationBuilder.CreateIndex(
                name: "UX_AiConversationArtifacts_OpenArtifact",
                table: "AiConversationArtifacts",
                column: "ConversationId",
                unique: true,
                filter: "[Status] IN ('Pending', 'Processing')");

            migrationBuilder.CreateIndex(
                name: "IX_AiConversationEffects_ConversationId",
                table: "AiConversationEffects",
                column: "ConversationId");

            migrationBuilder.CreateIndex(
                name: "IX_AiConversationEffects_IdempotencyKey",
                table: "AiConversationEffects",
                column: "IdempotencyKey",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AiConversationEffects_Status_LeaseExpiresAt",
                table: "AiConversationEffects",
                columns: new[] { "Status", "LeaseExpiresAt" });

            migrationBuilder.CreateIndex(
                name: "IX_AiConversationMessages_ArtifactId_ConversationId",
                table: "AiConversationMessages",
                columns: new[] { "ArtifactId", "ConversationId" });

            migrationBuilder.CreateIndex(
                name: "IX_AiConversationMessages_ConversationId_TurnNumber_Sequence",
                table: "AiConversationMessages",
                columns: new[] { "ConversationId", "TurnNumber", "Sequence" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AiConversations_CurrentArtifactId_Id",
                table: "AiConversations",
                columns: new[] { "CurrentArtifactId", "Id" });

            migrationBuilder.CreateIndex(
                name: "IX_AiConversations_UserId_Mode_LifecycleStatus",
                table: "AiConversations",
                columns: new[] { "UserId", "Mode", "LifecycleStatus" });

            migrationBuilder.CreateIndex(
                name: "UX_AiConversations_ActiveSlot",
                table: "AiConversations",
                columns: new[] { "UserId", "ActiveConversationSlot" },
                unique: true,
                filter: "[ActiveConversationSlot] IS NOT NULL");

            migrationBuilder.AddForeignKey(
                name: "FK_AiConversationArtifacts_AiConversationEffects_CreatedByEffectId_ConversationId",
                table: "AiConversationArtifacts",
                columns: new[] { "CreatedByEffectId", "ConversationId" },
                principalTable: "AiConversationEffects",
                principalColumns: new[] { "Id", "ConversationId" });

            migrationBuilder.AddForeignKey(
                name: "FK_AiConversationArtifacts_AiConversations_ConversationId",
                table: "AiConversationArtifacts",
                column: "ConversationId",
                principalTable: "AiConversations",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_AiConversationArtifacts_AiConversationEffects_CreatedByEffectId_ConversationId",
                table: "AiConversationArtifacts");

            migrationBuilder.DropForeignKey(
                name: "FK_AiConversationArtifacts_AiConversations_ConversationId",
                table: "AiConversationArtifacts");

            migrationBuilder.DropTable(
                name: "AiConversationMessages");

            migrationBuilder.DropTable(
                name: "AiTaskDraftArtifacts");

            migrationBuilder.DropTable(
                name: "AiConversationEffects");

            migrationBuilder.DropTable(
                name: "AiConversations");

            migrationBuilder.DropTable(
                name: "AiConversationArtifacts");
        }
    }
}
