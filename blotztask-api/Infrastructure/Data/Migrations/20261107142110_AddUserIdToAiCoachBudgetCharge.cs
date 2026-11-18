using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BlotzTask.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddUserIdToAiCoachBudgetCharge : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "UserId",
                table: "AiCoachBudgetCharge",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_AiCoachBudgetCharge_UserId_BudgetDate",
                table: "AiCoachBudgetCharge",
                columns: new[] { "UserId", "BudgetDate" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_AiCoachBudgetCharge_UserId_BudgetDate",
                table: "AiCoachBudgetCharge");

            migrationBuilder.DropColumn(
                name: "UserId",
                table: "AiCoachBudgetCharge");
        }
    }
}
