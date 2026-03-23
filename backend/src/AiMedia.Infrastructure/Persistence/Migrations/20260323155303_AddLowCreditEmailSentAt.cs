using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AiMedia.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddLowCreditEmailSentAt : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterDatabase()
                .OldAnnotation("Npgsql:Enum:job_status", "queued,processing,completed,failed,cancelled")
                .OldAnnotation("Npgsql:Enum:model_tier", "free,standard,premium")
                .OldAnnotation("Npgsql:Enum:product_type", "image_gen,image_to_video,text_to_video,voice,transcription,background_removal")
                .OldAnnotation("Npgsql:Enum:subscription_plan", "free,starter,creator,pro")
                .OldAnnotation("Npgsql:Enum:transaction_type", "purchase,deduction,refund,bonus,expiry,reservation");

            migrationBuilder.AddColumn<DateTime>(
                name: "low_credit_email_sent_at",
                table: "users",
                type: "timestamp with time zone",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "low_credit_email_sent_at",
                table: "users");

            migrationBuilder.AlterDatabase()
                .Annotation("Npgsql:Enum:job_status", "queued,processing,completed,failed,cancelled")
                .Annotation("Npgsql:Enum:model_tier", "free,standard,premium")
                .Annotation("Npgsql:Enum:product_type", "image_gen,image_to_video,text_to_video,voice,transcription,background_removal")
                .Annotation("Npgsql:Enum:subscription_plan", "free,starter,creator,pro")
                .Annotation("Npgsql:Enum:transaction_type", "purchase,deduction,refund,bonus,expiry,reservation");
        }
    }
}
