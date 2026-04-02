using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AiMedia.Infrastructure.Persistence.Migrations
{
    public partial class UpdateFaqPricingCopy : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
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
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.UpdateData(
                table: "faq_items",
                keyColumn: "question",
                keyValue: "What AI models are available?",
                column: "answer",
                value: "<p>VoicesForge offers 6 AI-powered tools:</p><ul><li>🖼️ <strong>Image Generation</strong> — create images from text prompts</li><li>🎬 <strong>Image to Video</strong> — animate a still image into a short video</li><li>🎥 <strong>Text to Video</strong> — generate video directly from a text description</li><li>🎙️ <strong>Text to Voice</strong> — convert text to natural-sounding speech, with voice cloning support</li><li>📝 <strong>Transcription</strong> — convert audio/video to text automatically</li><li>✂️ <strong>Background Removal</strong> — remove the background from any image instantly</li></ul>");

            migrationBuilder.UpdateData(
                table: "faq_items",
                keyColumn: "question",
                keyValue: "How much does each model cost?",
                column: "answer",
                value: "<table><thead><tr><th>Model</th><th>Cost</th></tr></thead><tbody><tr><td>✂️ Background Removal</td><td>3 credits</td></tr><tr><td>🎙️ Text to Voice</td><td>from 4 credits</td></tr><tr><td>🖼️ Image Generation</td><td>from 5 credits</td></tr><tr><td>📝 Transcription</td><td>from 10 credits</td></tr><tr><td>🎬 Image to Video</td><td>from 25 credits</td></tr><tr><td>🎥 Text to Video</td><td>from 25 credits</td></tr></tbody></table><p style='margin-top:0.5rem;font-size:0.85rem;color:#6b7280;'>1 credit = $0.01 USD</p>");
        }
    }
}
