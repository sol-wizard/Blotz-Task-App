using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BlotzTask.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddBadgeDisplayCustomizationFlag : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "HasCustomizedBadgeDisplay",
                table: "UserPreferences",
                type: "bit",
                nullable: false,
                defaultValue: false);

            // Backfill: UserBadges.DisplayOrder was added without one (20260705094443), so every
            // row predating it is NULL. Once the achievement preview reads DisplayOrder as the
            // equipped slot, those users would see an empty preview, so seed the default here:
            // the 3 earliest earned badges take slots 0/1/2.
            //
            // Only users with no equipped badge at all are touched. Equipping does not exist yet,
            // so "all NULL" can only mean pre-migration data — no real selection can be clobbered.
            // EarnedAtUtc ties are broken by Id: a single award batch stamps every badge with the
            // same timestamp, so time alone does not give a deterministic order.
            migrationBuilder.Sql("""
                WITH RankedBadges AS (
                    SELECT Id,
                           ROW_NUMBER() OVER (PARTITION BY UserId ORDER BY EarnedAtUtc, Id) AS RowNum
                    FROM UserBadges
                    WHERE UserId NOT IN (
                        SELECT UserId FROM UserBadges WHERE DisplayOrder IS NOT NULL
                    )
                )
                UPDATE ub
                SET DisplayOrder = r.RowNum - 1
                FROM UserBadges ub
                INNER JOIN RankedBadges r ON r.Id = ub.Id
                WHERE r.RowNum <= 3;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // The DisplayOrder backfill is deliberately not reverted: by the time this runs, a
            // backfilled slot is indistinguishable from one the user picked, and nulling both out
            // would throw away real selections.
            migrationBuilder.DropColumn(
                name: "HasCustomizedBadgeDisplay",
                table: "UserPreferences");
        }
    }
}
