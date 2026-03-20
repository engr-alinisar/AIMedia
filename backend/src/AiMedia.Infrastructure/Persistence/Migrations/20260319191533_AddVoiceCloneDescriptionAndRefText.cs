using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AiMedia.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddVoiceCloneDescriptionAndRefText : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "description",
                table: "voice_clones",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "reference_text",
                table: "voice_clones",
                type: "text",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "description",
                table: "voice_clones");

            migrationBuilder.DropColumn(
                name: "reference_text",
                table: "voice_clones");
        }
    }
}
