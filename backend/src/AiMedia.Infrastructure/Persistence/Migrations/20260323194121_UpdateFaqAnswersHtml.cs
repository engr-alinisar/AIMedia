using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AiMedia.Infrastructure.Persistence.Migrations
{
    public partial class UpdateFaqAnswersHtml : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Increase answer column length to support HTML
            migrationBuilder.AlterColumn<string>(
                name: "answer",
                table: "faq_items",
                type: "character varying(5000)",
                maxLength: 5000,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(2000)",
                oldMaxLength: 2000);

            // Credits
            migrationBuilder.UpdateData(
                table: "faq_items",
                keyColumn: "question",
                keyValue: "How do credits work?",
                column: "answer",
                value: "<p>Credits are the currency used on VoicesForge. Here's how they work:</p><ul><li><strong>Reserve:</strong> When you submit a job, credits are reserved from your balance.</li><li><strong>Deduct:</strong> On successful completion, the reserved credits are deducted.</li><li><strong>Release:</strong> If a job fails, reserved credits are returned to your balance automatically.</li></ul>");

            migrationBuilder.UpdateData(
                table: "faq_items",
                keyColumn: "question",
                keyValue: "How many free credits do I get?",
                column: "answer",
                value: "<p>Every new account receives <strong>50 free credits</strong> on registration — no credit card required.</p><p>This lets you try all features before purchasing. Note: free credits are only given once per email address.</p>");

            migrationBuilder.UpdateData(
                table: "faq_items",
                keyColumn: "question",
                keyValue: "Do credits expire?",
                column: "answer",
                value: "<p><strong>No</strong> — purchased credits never expire. Use them at your own pace, whenever you need them.</p>");

            migrationBuilder.UpdateData(
                table: "faq_items",
                keyColumn: "question",
                keyValue: "What happens if I run out of credits?",
                column: "answer",
                value: "<p>If your balance is too low to cover a job, the job will not be submitted.</p><ul><li>You will receive a <strong>low credit warning email</strong> when your balance drops below 50 credits.</li><li>A warning banner also appears on the Credits page.</li><li>Top up anytime from the <strong>Credits</strong> page.</li></ul>");

            // Payments
            migrationBuilder.UpdateData(
                table: "faq_items",
                keyColumn: "question",
                keyValue: "What payment methods are accepted?",
                column: "answer",
                value: "<p>We accept payments via <strong>PayPal</strong>, which supports:</p><ul><li>All major credit and debit cards (Visa, Mastercard, Amex)</li><li>PayPal balance</li></ul><p>All transactions are processed securely through PayPal's checkout.</p>");

            migrationBuilder.UpdateData(
                table: "faq_items",
                keyColumn: "question",
                keyValue: "Is there a refund policy?",
                column: "answer",
                value: "<p>All credit purchases are <strong>final and non-refundable</strong>.</p><p>We offer <strong>50 free credits</strong> to every new account so you can fully test the platform before making a purchase. We encourage you to use your free credits first.</p>");

            migrationBuilder.UpdateData(
                table: "faq_items",
                keyColumn: "question",
                keyValue: "How long does it take for credits to appear after payment?",
                column: "answer",
                value: "<p>Credits are added to your account <strong>instantly</strong> after a successful payment — no waiting required.</p>");

            migrationBuilder.UpdateData(
                table: "faq_items",
                keyColumn: "question",
                keyValue: "Is my payment information secure?",
                column: "answer",
                value: "<p>Yes, completely. We use <strong>PayPal</strong> for all payments, which means:</p><ul><li>We never see or store your card details</li><li>All transactions are encrypted and handled by PayPal</li><li>PayPal's buyer protection applies to your purchases</li></ul>");

            // AI Models
            migrationBuilder.UpdateData(
                table: "faq_items",
                keyColumn: "question",
                keyValue: "What AI models are available?",
                column: "answer",
                value: "<p>VoicesForge offers 6 AI-powered tools:</p><ul><li>🖼️ <strong>Text to Image</strong> — create images from text prompts</li><li>🎬 <strong>Image to Video</strong> — animate a still image into a short video</li><li>🎥 <strong>Text to Video</strong> — generate video directly from a text description</li><li>🎙️ <strong>Text to Audio</strong> — convert text to natural-sounding speech, with voice cloning support</li><li>📝 <strong>Audio to Text</strong> — convert audio or video to text automatically</li><li>✂️ <strong>Image Studio</strong> — remove the background from any image instantly</li></ul>");

            migrationBuilder.UpdateData(
                table: "faq_items",
                keyColumn: "question",
                keyValue: "How much does each model cost?",
                column: "answer",
                value: "<table><thead><tr><th>Tool</th><th>Cost</th></tr></thead><tbody><tr><td>✂️ Image Studio</td><td>from 4 credits</td></tr><tr><td>🎙️ Text to Audio</td><td>from 4 credits</td></tr><tr><td>🖼️ Text to Image</td><td>from 10 credits</td></tr><tr><td>📝 Audio to Text</td><td>from 1 credit</td></tr><tr><td>🎬 Image to Video</td><td>from 42 credits</td></tr><tr><td>🎥 Text to Video</td><td>from 25 credits</td></tr></tbody></table><p style='margin-top:0.5rem;font-size:0.85rem;color:#6b7280;'>1 credit = $0.01 USD</p>");

            migrationBuilder.UpdateData(
                table: "faq_items",
                keyColumn: "question",
                keyValue: "How long does generation take?",
                column: "answer",
                value: "<p>Most jobs complete within <strong>10–60 seconds</strong>. Times vary by tool:</p><ul><li><strong>Image Studio</strong> — ~5 seconds</li><li><strong>Text to Image</strong> — 10–20 seconds</li><li><strong>Text to Audio</strong> — 5–15 seconds</li><li><strong>Audio to Text</strong> — depends on audio length</li><li><strong>Image to Video / Text to Video</strong> — 30–90 seconds</li></ul><p>You'll receive a real-time notification as soon as your job completes.</p>");

            migrationBuilder.UpdateData(
                table: "faq_items",
                keyColumn: "question",
                keyValue: "Why is my job stuck in Queued status?",
                column: "answer",
                value: "<p>Jobs are processed automatically after submission. If your job stays in <strong>Queued</strong> for more than a few minutes:</p><ol><li>Wait up to 5 minutes — jobs are retried automatically</li><li>Refresh the <strong>My Jobs</strong> page</li><li>If still stuck after 10 minutes, contact support via the chat bubble</li></ol><p>Your credits are always safe — they are only deducted on success.</p>");

            // Account
            migrationBuilder.UpdateData(
                table: "faq_items",
                keyColumn: "question",
                keyValue: "How do I change my password?",
                column: "answer",
                value: "<ol><li>Click your <strong>avatar icon</strong> in the bottom-left of the sidebar</li><li>Select <strong>Profile</strong></li><li>Scroll to the <strong>Change Password</strong> section</li><li>Enter your current password and your new password, then click <strong>Update Password</strong></li></ol>");

            migrationBuilder.UpdateData(
                table: "faq_items",
                keyColumn: "question",
                keyValue: "Can I delete my account?",
                column: "answer",
                value: "<p>Yes. To delete your account:</p><ol><li>Go to <strong>Profile</strong> (click your avatar → Profile)</li><li>Scroll to <strong>Danger Zone</strong></li><li>Click <strong>Delete Account</strong> and confirm with your password</li></ol><p><strong>Important:</strong> If you re-register with the same email address, you will <strong>not</strong> receive free credits again.</p>");

            migrationBuilder.UpdateData(
                table: "faq_items",
                keyColumn: "question",
                keyValue: "I didn't receive my verification email.",
                column: "answer",
                value: "<p>If you didn't receive the verification email:</p><ol><li>Check your <strong>spam or junk</strong> folder</li><li>Make sure you entered the correct email address</li><li>Wait a few minutes and check again</li><li>If still not received, contact support via the chat bubble and we'll verify your account manually</li></ol>");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "answer",
                table: "faq_items",
                type: "character varying(2000)",
                maxLength: 2000,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(5000)",
                oldMaxLength: 5000);
        }
    }
}
