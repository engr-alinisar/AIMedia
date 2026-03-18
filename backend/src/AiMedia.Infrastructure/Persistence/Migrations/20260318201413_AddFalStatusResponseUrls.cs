using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AiMedia.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddFalStatusResponseUrls : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "fal_response_url",
                table: "generation_jobs",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "fal_status_url",
                table: "generation_jobs",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "fal_response_url",
                table: "generation_jobs");

            migrationBuilder.DropColumn(
                name: "fal_status_url",
                table: "generation_jobs");
        }
    }
}
