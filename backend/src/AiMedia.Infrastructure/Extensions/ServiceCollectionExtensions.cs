using AiMedia.Application.Interfaces;
using AiMedia.Domain.Enums;
using AiMedia.Infrastructure.Credits;
using AiMedia.Infrastructure.Persistence;
using AiMedia.Infrastructure.Services;
using AiMedia.Infrastructure.Storage;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Npgsql;

namespace AiMedia.Infrastructure.Extensions;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration config)
    {
        // PostgreSQL + EF Core
        // Npgsql requires enum types to be registered on the data source builder
        // so they can be read from / written to PostgreSQL correctly
        var connectionString = config.GetConnectionString("DefaultConnection")
                            ?? config["DATABASE_URL"]
                            ?? throw new InvalidOperationException("Database connection string not configured");

        var dataSourceBuilder = new NpgsqlDataSourceBuilder(connectionString);
        dataSourceBuilder.MapEnum<ProductType>();
        dataSourceBuilder.MapEnum<ModelTier>();
        dataSourceBuilder.MapEnum<JobStatus>();
        dataSourceBuilder.MapEnum<SubscriptionPlan>();
        dataSourceBuilder.MapEnum<TransactionType>();
        var dataSource = dataSourceBuilder.Build();

        services.AddDbContext<AppDbContext>(opts =>
            opts.UseNpgsql(dataSource, npgsql => npgsql
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

        // Email
        services.AddHttpClient<EmailService>();
        services.AddScoped<IEmailService, EmailService>();

        return services;
    }
}
