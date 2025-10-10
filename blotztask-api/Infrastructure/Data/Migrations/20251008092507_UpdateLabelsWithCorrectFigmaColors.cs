using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BlotzTask.Migrations
{
    /// <inheritdoc />
    public partial class UpdateLabelsWithCorrectFigmaColors : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.UpdateData(
                table: "Labels",
                keyColumn: "LabelId",
                keyValue: 6,
                columns: new[] { "Color", "Description" },
                values: new object[] { "#c2e49f", "Work related tasks" });

            migrationBuilder.UpdateData(
                table: "Labels",
                keyColumn: "LabelId",
                keyValue: 7,
                columns: new[] { "Color", "Description", "Name" },
                values: new object[] { "#cce7db", "Life related tasks", "Life" });

            migrationBuilder.UpdateData(
                table: "Labels",
                keyColumn: "LabelId",
                keyValue: 8,
                columns: new[] { "Color", "Description", "Name" },
                values: new object[] { "#d6faf9", "Learning related tasks", "Learning" });

            migrationBuilder.UpdateData(
                table: "Labels",
                keyColumn: "LabelId",
                keyValue: 9,
                columns: new[] { "Color", "Description", "Name" },
                values: new object[] { "#bad5fa", "Health related tasks", "Health" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.UpdateData(
                table: "Labels",
                keyColumn: "LabelId",
                keyValue: 6,
                columns: new[] { "Color", "Description" },
                values: new object[] { "#7758FF", "Work related tasks" });

            migrationBuilder.UpdateData(
                table: "Labels",
                keyColumn: "LabelId",
                keyValue: 7,
                columns: new[] { "Color", "Description", "Name" },
                values: new object[] { "#FFDE23", "Personal tasks", "Personal" });

            migrationBuilder.UpdateData(
                table: "Labels",
                keyColumn: "LabelId",
                keyValue: 8,
                columns: new[] { "Color", "Description", "Name" },
                values: new object[] { "#FF4747", "Academic tasks", "Academic" });

            migrationBuilder.UpdateData(
                table: "Labels",
                keyColumn: "LabelId",
                keyValue: 9,
                columns: new[] { "Color", "Description", "Name" },
                values: new object[] { "#09F1D6", "Other tasks", "Others" });
        }
    }
}
