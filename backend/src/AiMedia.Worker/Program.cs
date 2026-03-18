using AiMedia.FalAi.Extensions;
using AiMedia.Infrastructure.Extensions;
using AiMedia.Worker.EventHandlers;
using AiMedia.Worker.Hubs;
using AiMedia.Worker.Jobs;
using Hangfire;
using Hangfire.PostgreSql;
using Serilog;

Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .CreateBootstrapLogger();

try
{
    var builder = Host.CreateApplicationBuilder(args);

    // Serilog
    builder.Services.AddSerilog((_, lc) => lc
        .ReadFrom.Configuration(builder.Configuration)
        .WriteTo.Console()
        .Enrich.FromLogContext());

    // Infrastructure (EF Core, R2, Credits, JWT)
    builder.Services.AddInfrastructure(builder.Configuration);

    // fal.ai
    builder.Services.AddFalAi(builder.Configuration);

    // MediatR — Application + Worker assemblies (event handlers live in Worker)
    builder.Services.AddMediatR(cfg =>
    {
        cfg.RegisterServicesFromAssembly(typeof(AiMedia.Application.Commands.Auth.LoginCommand).Assembly);
        cfg.RegisterServicesFromAssembly(typeof(JobCompletedEventHandler).Assembly);
    });

    // SignalR with Redis backplane — Worker pushes via Redis to API hub
    var redisUrl = builder.Configuration["REDIS_URL"]
                ?? builder.Configuration.GetConnectionString("Redis");

    var signalR = builder.Services.AddSignalR();
    if (!string.IsNullOrEmpty(redisUrl))
        signalR.AddStackExchangeRedis(redisUrl);

    // Register the hub so IHubContext<GenerationHub> can be injected
    builder.Services.AddSingleton<GenerationHub>();

    // Hangfire server
    var dbConn = builder.Configuration.GetConnectionString("DefaultConnection")
              ?? builder.Configuration["DATABASE_URL"]
              ?? throw new InvalidOperationException("Database connection string not configured.");

    builder.Services.AddHangfire(cfg => cfg
        .SetDataCompatibilityLevel(CompatibilityLevel.Version_180)
        .UseSimpleAssemblyNameTypeSerializer()
        .UseRecommendedSerializerSettings()
        .UsePostgreSqlStorage(o => o.UseNpgsqlConnection(dbConn)));

    builder.Services.AddHangfireServer(opts =>
    {
        opts.WorkerCount = Environment.ProcessorCount * 2;
        opts.Queues = ["default"];
    });

    // Register Hangfire jobs for DI
    builder.Services.AddScoped<PollStuckJobsJob>();
    builder.Services.AddScoped<ExpireCreditsJob>();

    var host = builder.Build();

    // Register recurring Hangfire jobs after host is built
    using (var scope = host.Services.CreateScope())
    {
        var recurringJobs = scope.ServiceProvider.GetRequiredService<IRecurringJobManager>();

        recurringJobs.AddOrUpdate<PollStuckJobsJob>(
            "poll-stuck-jobs",
            job => job.ExecuteAsync(CancellationToken.None),
            "*/5 * * * *"); // every 5 minutes

        recurringJobs.AddOrUpdate<ExpireCreditsJob>(
            "expire-credits",
            job => job.ExecuteAsync(CancellationToken.None),
            Cron.Daily);
    }

    await host.RunAsync();
}
catch (Exception ex) when (ex is not HostAbortedException)
{
    Log.Fatal(ex, "Worker terminated unexpectedly");
}
finally
{
    Log.CloseAndFlush();
}
