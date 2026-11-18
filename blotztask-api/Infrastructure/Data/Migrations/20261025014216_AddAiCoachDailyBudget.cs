using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BlotzTask.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddAiCoachDailyBudget : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AiCoachBudgetCharge",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    BudgetDate = table.Column<DateOnly>(type: "date", nullable: false),
                    Environment = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    Model = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    ChargedUsd = table.Column<decimal>(type: "decimal(20,10)", precision: 20, scale: 10, nullable: false),
                    Settled = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AiCoachBudgetCharge", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AiCoachBudgetCharge_Environment_BudgetDate",
                table: "AiCoachBudgetCharge",
                columns: new[] { "Environment", "BudgetDate" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AiCoachBudgetCharge");
        }
    }
}
