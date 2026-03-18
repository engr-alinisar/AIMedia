using System.Text;
using AiMedia.API.Hubs;
using AiMedia.API.Middleware;
using AiMedia.FalAi.Extensions;
using AiMedia.Infrastructure.Extensions;
using Hangfire;
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

    // MediatR — scan Application assembly
    builder.Services.AddMediatR(cfg =>
        cfg.RegisterServicesFromAssembly(typeof(AiMedia.Application.Commands.Auth.LoginCommand).Assembly));

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

    // SignalR with optional Redis backplane
    var redisUrl = builder.Configuration["REDIS_URL"]
                ?? builder.Configuration.GetConnectionString("Redis");
    var signalR = builder.Services.AddSignalR();
    if (!string.IsNullOrEmpty(redisUrl))
        signalR.AddStackExchangeRedis(redisUrl);

    // Hangfire with PostgreSQL storage
    var dbConn = builder.Configuration.GetConnectionString("DefaultConnection")
              ?? builder.Configuration["DATABASE_URL"]
              ?? throw new InvalidOperationException("Database connection string not configured.");

    builder.Services.AddHangfire(cfg => cfg
        .SetDataCompatibilityLevel(CompatibilityLevel.Version_180)
        .UseSimpleAssemblyNameTypeSerializer()
        .UseRecommendedSerializerSettings()
        .UsePostgreSqlStorage(o => o.UseNpgsqlConnection(dbConn)));

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
    app.UseHangfireDashboard("/hangfire");

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
