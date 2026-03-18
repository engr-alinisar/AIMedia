using AiMedia.Application.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace AiMedia.FalAi.Extensions;

public static class FalAiServiceExtensions
{
    public static IServiceCollection AddFalAi(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        // Support both env var FAL_API_KEY and appsettings FalAi:ApiKey
        var apiKey = configuration["FAL_API_KEY"]
            ?? configuration["FalAi:ApiKey"]
            ?? throw new InvalidOperationException("FAL_API_KEY is not configured.");

        // FalService — typed HttpClient with auth header, registered as IFalClient
        services.AddHttpClient<IFalClient, FalService>(client =>
        {
            client.DefaultRequestHeaders.Add("Authorization", $"Key {apiKey}");
        });

        // FalWebhookVerifier — separate HttpClient (calls fal JWKS endpoint, no auth needed)
        services.AddHttpClient<FalWebhookVerifier>();

        // ModelRouter — stateless, singleton
        services.AddSingleton<ModelRouter>();

        return services;
    }
}
