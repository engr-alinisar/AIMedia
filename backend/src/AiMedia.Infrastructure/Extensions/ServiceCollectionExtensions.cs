using AiMedia.Application.Interfaces;
using AiMedia.Infrastructure.Credits;
using AiMedia.Infrastructure.Persistence;
using AiMedia.Infrastructure.Services;
using AiMedia.Infrastructure.Storage;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace AiMedia.Infrastructure.Extensions;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration config)
    {
        // PostgreSQL + EF Core
        services.AddDbContext<AppDbContext>(opts =>
            opts.UseNpgsql(
                    config.GetConnectionString("DefaultConnection") ?? config["DATABASE_URL"]
                    ?? throw new InvalidOperationException("Database connection string not configured"),
                    npgsql => npgsql
                        .SetPostgresVersion(16, 0)
                        .EnableRetryOnFailure(3))
                .UseSnakeCaseNamingConvention());

        services.AddScoped<IAppDbContext>(sp => sp.GetRequiredService<AppDbContext>());

        // Storage
        services.AddHttpClient<R2StorageService>();
        services.AddScoped<IStorageService, R2StorageService>();

        // Credits
        services.AddScoped<ICreditService, CreditService>();

        // JWT
        services.AddSingleton<IJwtService, JwtService>();

        return services;
    }
}
