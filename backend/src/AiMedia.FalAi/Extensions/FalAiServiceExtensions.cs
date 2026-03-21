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
        var apiKey = configuration["FAL_API_KEY"]
            ?? configuration["FalAi:ApiKey"]
            ?? throw new InvalidOperationException("FAL_API_KEY is not configured.");

        services.AddHttpClient<IFalClient, FalService>(client =>
        {
            client.DefaultRequestHeaders.Add("Authorization", $"Key {apiKey}");
        });

        return services;
    }
}
