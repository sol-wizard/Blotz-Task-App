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
                columns: new[] { "Color", "Name" },
                values: new object[] { "#c2e49f", "work" });

            migrationBuilder.UpdateData(
                table: "Labels",
                keyColumn: "LabelId",
                keyValue: 7,
                columns: new[] { "Color", "Description", "Name" },
                values: new object[] { "#cce7db", "Life related tasks", "life" });

            migrationBuilder.UpdateData(
                table: "Labels",
                keyColumn: "LabelId",
                keyValue: 8,
                columns: new[] { "Color", "Description", "Name" },
                values: new object[] { "#d6faf9", "Learning related tasks", "learning" });

            migrationBuilder.UpdateData(
                table: "Labels",
                keyColumn: "LabelId",
                keyValue: 9,
                columns: new[] { "Color", "Description", "Name" },
                values: new object[] { "#bad5fa", "Workout related tasks", "workout" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.UpdateData(
                table: "Labels",
                keyColumn: "LabelId",
                keyValue: 6,
                columns: new[] { "Color", "Name" },
                values: new object[] { "#7758FF", "Work" });

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
