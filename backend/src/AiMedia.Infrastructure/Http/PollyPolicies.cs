using Polly;
using Polly.Extensions.Http;
using Microsoft.Extensions.Logging;

namespace AiMedia.Infrastructure.Http;

public static class PollyPolicies
{
    /// <summary>
    /// Retry on 429 (rate limit) and 503 (service unavailable) with exponential backoff.
    /// Do NOT retry on 400/422 (bad request — won't succeed on retry).
    /// </summary>
    public static IAsyncPolicy<HttpResponseMessage> GetRetryPolicy(ILogger logger) =>
        HttpPolicyExtensions
            .HandleTransientHttpError()
            .OrResult(msg => msg.StatusCode == System.Net.HttpStatusCode.TooManyRequests)
            .WaitAndRetryAsync(
                3,
                retryAttempt => TimeSpan.FromSeconds(Math.Pow(2, retryAttempt)),
                onRetry: (outcome, timespan, retryCount, _) =>
                {
                    logger.LogWarning(
                        "Retry {RetryCount} after {Delay}s due to {StatusCode}",
                        retryCount, timespan.TotalSeconds, outcome.Result?.StatusCode);
                });

    public static IAsyncPolicy<HttpResponseMessage> GetCircuitBreakerPolicy(ILogger logger) =>
        HttpPolicyExtensions
            .HandleTransientHttpError()
            .CircuitBreakerAsync(
                5,
                TimeSpan.FromSeconds(30),
                onBreak: (_, duration) => logger.LogError("Circuit breaker opened for {Duration}s", duration.TotalSeconds),
                onReset: () => logger.LogInformation("Circuit breaker reset"));
}
