using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BlotzTask.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class RenameTokenPropertiesAndChangeSubscriptionLimit : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "PromptTokens",
                table: "AiUsageRecords",
                newName: "OutputTokens");

            migrationBuilder.RenameColumn(
                name: "CompletionTokens",
                table: "AiUsageRecords",
                newName: "InputTokens");

            migrationBuilder.UpdateData(
                table: "SubscriptionPlans",
                keyColumn: "Id",
                keyValue: 1,
                column: "MonthlyTokenLimit",
                value: 300000);

            migrationBuilder.UpdateData(
                table: "SubscriptionPlans",
                keyColumn: "Id",
                keyValue: 2,
                column: "MonthlyTokenLimit",
                value: 3000000);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "OutputTokens",
                table: "AiUsageRecords",
                newName: "PromptTokens");

            migrationBuilder.RenameColumn(
                name: "InputTokens",
                table: "AiUsageRecords",
                newName: "CompletionTokens");

            migrationBuilder.UpdateData(
                table: "SubscriptionPlans",
                keyColumn: "Id",
                keyValue: 1,
                column: "MonthlyTokenLimit",
                value: 50000);

            migrationBuilder.UpdateData(
                table: "SubscriptionPlans",
                keyColumn: "Id",
                keyValue: 2,
                column: "MonthlyTokenLimit",
                value: 500000);
        }
    }
}
