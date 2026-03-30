using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AiMedia.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddModelPricings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "model_pricings",
                columns: table => new
                {
                    model_id = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    credits_base = table.Column<int>(type: "integer", nullable: false),
                    credits_per_second = table.Column<int>(type: "integer", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_model_pricings", x => x.model_id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "model_pricings");
        }
    }
}
