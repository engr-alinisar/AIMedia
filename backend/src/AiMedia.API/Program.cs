using System.Text;
using AiMedia.API.Security;
using AiMedia.API.Hubs;
using Microsoft.EntityFrameworkCore;
using AiMedia.API.Middleware;
using AiMedia.FalAi.Extensions;
using AiMedia.Infrastructure.Extensions;
using Hangfire;
using Hangfire.Dashboard;
using Hangfire.PostgreSql;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Serilog;

Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .CreateBootstrapLogger();

try
{
    var builder = WebApplication.CreateBuilder(args);

    // Serilog
    builder.Host.UseSerilog((ctx, lc) => lc
        .ReadFrom.Configuration(ctx.Configuration)
        .WriteTo.Console()
        .Enrich.FromLogContext());

    // Infrastructure (EF Core, R2, Credits, JWT)
    builder.Services.AddInfrastructure(builder.Configuration);

    // fal.ai integration
    builder.Services.AddFalAi(builder.Configuration);

    // MediatR — scan Application assembly + API assembly (job event handlers)
    builder.Services.AddMediatR(cfg =>
    {
        cfg.RegisterServicesFromAssembly(typeof(AiMedia.Application.Commands.Auth.LoginCommand).Assembly);
        cfg.RegisterServicesFromAssembly(typeof(AiMedia.API.BackgroundJobs.JobCompletedEventHandler).Assembly);
    });

    // Controllers
    builder.Services.AddControllers()
        .AddJsonOptions(opts =>
            opts.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter()));

    // JWT Bearer auth
    var jwtSecret = builder.Configuration["Jwt:Secret"]
        ?? throw new InvalidOperationException("Jwt:Secret is not configured.");

    builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
        .AddJwtBearer(opts =>
        {
            opts.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
                ValidateIssuer = true,
                ValidIssuer = builder.Configuration["Jwt:Issuer"] ?? "AiMedia",
                ValidateAudience = true,
                ValidAudience = builder.Configuration["Jwt:Audience"] ?? "AiMedia",
                ClockSkew = TimeSpan.Zero
            };

            // Allow JWT from SignalR query string
            opts.Events = new JwtBearerEvents
            {
                OnMessageReceived = ctx =>
                {
                    var token = ctx.Request.Query["access_token"];
                    if (!string.IsNullOrEmpty(token) &&
                        ctx.HttpContext.Request.Path.StartsWithSegments("/hubs"))
                    {
                        ctx.Token = token;
                    }
                    return Task.CompletedTask;
                }
            };
        });

    builder.Services.AddAuthorization();

    builder.Services.AddSignalR()
        .AddJsonProtocol(opts =>
        {
            opts.PayloadSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
            opts.PayloadSerializerOptions.Converters.Add(
                new System.Text.Json.Serialization.JsonStringEnumConverter());
        });

    // Hangfire with PostgreSQL storage
    var dbConn = builder.Configuration.GetConnectionString("DefaultConnection")
              ?? builder.Configuration["DATABASE_URL"]
              ?? throw new InvalidOperationException("Database connection string not configured.");

    builder.Services.AddHangfire(cfg => cfg
        .SetDataCompatibilityLevel(CompatibilityLevel.Version_180)
        .UseSimpleAssemblyNameTypeSerializer()
        .UseRecommendedSerializerSettings()
        .UsePostgreSqlStorage(o => o.UseNpgsqlConnection(dbConn)));

    // API processes its own Hangfire jobs (webhook callbacks, stuck job polling)
    builder.Services.AddHangfireServer(opts =>
    {
        opts.WorkerCount = 4;
        opts.Queues = ["default"];
    });

    builder.Services.AddScoped<AiMedia.API.BackgroundJobs.PollStuckJobsJob>();
    builder.Services.AddScoped<AiMedia.API.BackgroundJobs.ExpireCreditsJob>();

    // CORS — allow Angular dev server and Vercel
    builder.Services.AddCors(opts =>
    {
        opts.AddDefaultPolicy(policy =>
        {
            var origins = builder.Configuration.GetSection("AllowedOrigins").Get<string[]>()
                ?? builder.Configuration["AllowedOrigins"]?.Split(',')
                ?? ["http://localhost:4200"];
            policy.WithOrigins(origins)
                  .AllowAnyHeader()
                  .AllowAnyMethod()
                  .AllowCredentials(); // Required for SignalR
        });
    });

    // Swagger
    builder.Services.AddEndpointsApiExplorer();
    builder.Services.AddSwaggerGen();

    // Health checks
    builder.Services.AddHealthChecks();

    var app = builder.Build();

    // Auto-apply pending EF Core migrations on startup (safe for single-instance Railway deployment)
    using (var scope = app.Services.CreateScope())
    {
        var db = scope.ServiceProvider
            .GetRequiredService<AiMedia.Infrastructure.Persistence.AppDbContext>();
        db.Database.Migrate();

        // Seed model pricing rows for any new models not yet in the DB
        var pricingSvc = scope.ServiceProvider.GetRequiredService<AiMedia.Application.Interfaces.IModelPricingService>();
        await pricingSvc.SeedAsync();
    }

    app.UseMiddleware<ExceptionHandlingMiddleware>();
    app.UseSerilogRequestLogging();

    if (app.Environment.IsDevelopment())
    {
        app.UseSwagger();
        app.UseSwaggerUI();
    }

    app.UseCors();
    app.UseAuthentication();
    app.UseAuthorization();

    app.MapControllers();
    app.MapHub<GenerationHub>("/hubs/generation");
    app.MapHealthChecks("/health");
    if (app.Environment.IsDevelopment())
    {
        app.UseHangfireDashboard("/hangfire");
    }
    else
    {
        var enableHangfireDashboard = builder.Configuration.GetValue<bool>("ENABLE_HANGFIRE_DASHBOARD");
        if (enableHangfireDashboard)
        {
            var dashboardUsername = builder.Configuration["HANGFIRE_DASHBOARD_USERNAME"];
            var dashboardPassword = builder.Configuration["HANGFIRE_DASHBOARD_PASSWORD"];

            if (string.IsNullOrWhiteSpace(dashboardUsername) || string.IsNullOrWhiteSpace(dashboardPassword))
            {
                Log.Warning("ENABLE_HANGFIRE_DASHBOARD is true but Hangfire dashboard credentials are missing. Dashboard remains disabled.");
            }
            else
            {
                app.UseHangfireDashboard("/hangfire", new DashboardOptions
                {
                    Authorization = [new HangfireBasicAuthFilter(dashboardUsername, dashboardPassword)]
                });
                Log.Information("Hangfire dashboard is enabled with HTTP basic auth.");
            }
        }
        else
        {
            Log.Information("Hangfire dashboard is disabled outside development.");
        }
    }

    using (var scope = app.Services.CreateScope())
    {
        var recurringJobs = scope.ServiceProvider.GetRequiredService<IRecurringJobManager>();
        var pollCron = app.Environment.IsDevelopment() ? Cron.Minutely() : "*/5 * * * *";
        recurringJobs.AddOrUpdate<AiMedia.API.BackgroundJobs.PollStuckJobsJob>(
            "poll-stuck-jobs",
            job => job.ExecuteAsync(CancellationToken.None),
            pollCron);
        recurringJobs.AddOrUpdate<AiMedia.API.BackgroundJobs.ExpireCreditsJob>(
            "expire-credits",
            job => job.ExecuteAsync(CancellationToken.None),
            Cron.Daily);
    }

    app.Run();
}
catch (Exception ex) when (ex is not HostAbortedException)
{
    Log.Fatal(ex, "Application terminated unexpectedly");
}
finally
{
    Log.CloseAndFlush();
}
