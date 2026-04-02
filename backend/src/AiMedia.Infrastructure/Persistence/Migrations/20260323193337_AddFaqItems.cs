using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace AiMedia.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddFaqItems : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "faq_items",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    question = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    answer = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    category = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    order = table.Column<int>(type: "integer", nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_faq_items", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "ix_faq_items_category_order",
                table: "faq_items",
                columns: new[] { "category", "order" });

            migrationBuilder.InsertData(
                table: "faq_items",
                columns: new[] { "question", "answer", "category", "order", "is_active", "created_at" },
                values: new object[,]
                {
                    // Credits
                    { "How do credits work?", "Credits are the currency used on VoicesForge. Each AI operation costs a certain number of credits. When you submit a job, credits are reserved. On success they are deducted, on failure they are returned to your balance.", "Credits", 1, true, DateTime.UtcNow },
                    { "How many free credits do I get?", "Every new account receives 50 free credits on registration. This lets you try all features before purchasing.", "Credits", 2, true, DateTime.UtcNow },
                    { "Do credits expire?", "No, purchased credits do not expire. Use them at your own pace.", "Credits", 3, true, DateTime.UtcNow },
                    { "What happens if I run out of credits?", "Your jobs will not be submitted until you top up your balance. You will receive a low credit warning email when your balance drops below 50 credits.", "Credits", 4, true, DateTime.UtcNow },
                    // Payments
                    { "What payment methods are accepted?", "We accept all major credit/debit cards and PayPal via our secure PayPal checkout.", "Payments", 1, true, DateTime.UtcNow },
                    { "Is there a refund policy?", "All credit purchases are final and non-refundable. We offer 50 free credits to every new account so you can try the platform before purchasing.", "Payments", 2, true, DateTime.UtcNow },
                    { "How long does it take for credits to appear after payment?", "Credits are added to your account instantly after a successful payment.", "Payments", 3, true, DateTime.UtcNow },
                    { "Is my payment information secure?", "Yes. We use PayPal for all payments — we never store your card details on our servers.", "Payments", 4, true, DateTime.UtcNow },
                    // AI Models
                    { "What AI models are available?", "VoicesForge offers Image Generation, Image to Video, Text to Video, Text to Voice (with voice cloning), Transcription, and Background Removal.", "AI Models", 1, true, DateTime.UtcNow },
                    { "How much does each model cost?", "Costs vary by model: Image Studio starts at 4 credits, Text to Audio from 4 credits, Text to Image from 10 credits, Audio to Text from 1 credit, Text to Video from 25 credits, and Image to Video from 42 credits.", "AI Models", 2, true, DateTime.UtcNow },
                    { "How long does generation take?", "Most jobs complete in 10–60 seconds depending on the model and complexity.", "AI Models", 3, true, DateTime.UtcNow },
                    { "Why is my job stuck in Queued status?", "Jobs are processed in the order received. If a job stays Queued for more than 5 minutes, it will be automatically retried. Contact support if the issue persists.", "AI Models", 4, true, DateTime.UtcNow },
                    // Account
                    { "How do I change my password?", "Go to your Profile page (click your avatar in the bottom left of the sidebar) and use the Change Password section.", "Account", 1, true, DateTime.UtcNow },
                    { "Can I delete my account?", "Yes. Go to Profile → Danger Zone → Delete Account. Note: if you re-register with the same email, you will not receive free credits again.", "Account", 2, true, DateTime.UtcNow },
                    { "I didn't receive my verification email.", "Check your spam folder. If not there, try registering again or contact support.", "Account", 3, true, DateTime.UtcNow },
                }
            );
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "faq_items");
        }
    }
}
