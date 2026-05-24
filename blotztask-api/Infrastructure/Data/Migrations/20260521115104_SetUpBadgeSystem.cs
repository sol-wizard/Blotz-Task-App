using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BlotzTask.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class SetUpBadgeSystem : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Order",
                table: "Badges");

            migrationBuilder.DropColumn(
                name: "Threshold",
                table: "Badges");

            migrationBuilder.CreateTable(
                name: "BadgeCriteria",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    BadgeId = table.Column<int>(type: "int", nullable: false),
                    TriggerAction = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    ConditionKey = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    ConditionOperator = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    ConditionValue = table.Column<double>(type: "float", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BadgeCriteria", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BadgeCriteria_Badges_BadgeId",
                        column: x => x.BadgeId,
                        principalTable: "Badges",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_BadgeCriteria_BadgeId",
                table: "BadgeCriteria",
                column: "BadgeId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "BadgeCriteria");

            migrationBuilder.AddColumn<int>(
                name: "Order",
                table: "Badges",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "Threshold",
                table: "Badges",
                type: "int",
                nullable: true);
        }
    }
}
