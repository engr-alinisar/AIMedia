using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AiMedia.Infrastructure.Persistence.Migrations
{
    public partial class UpdateFaqFreeCredits50 : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.UpdateData(
                table: "faq_items",
                keyColumn: "question",
                keyValue: "How many free credits do I get?",
                column: "answer",
                value: "<p>Every new account receives <strong>50 free credits</strong> on registration — no credit card required.</p><p>This lets you try all features before purchasing. Note: free credits are only given once per email address.</p>");

            migrationBuilder.UpdateData(
                table: "faq_items",
                keyColumn: "question",
                keyValue: "Is there a refund policy?",
                column: "answer",
                value: "<p>All credit purchases are <strong>final and non-refundable</strong>.</p><p>We offer <strong>50 free credits</strong> to every new account so you can fully test the platform before making a purchase. We encourage you to use your free credits first.</p>");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.UpdateData(
                table: "faq_items",
                keyColumn: "question",
                keyValue: "How many free credits do I get?",
                column: "answer",
                value: "<p>Every new account receives <strong>100 free credits</strong> on registration — no credit card required.</p><p>This lets you try all features before purchasing. Note: free credits are only given once per email address.</p>");

            migrationBuilder.UpdateData(
                table: "faq_items",
                keyColumn: "question",
                keyValue: "Is there a refund policy?",
                column: "answer",
                value: "<p>All credit purchases are <strong>final and non-refundable</strong>.</p><p>We offer <strong>100 free credits</strong> to every new account so you can fully test the platform before making a purchase. We encourage you to use your free credits first.</p>");
        }
    }
}
