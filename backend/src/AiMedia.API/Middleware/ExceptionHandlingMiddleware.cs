using System.Net;
using System.Text.Json;

namespace AiMedia.API.Middleware;

public class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;

    public ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            var (statusCode, message) = Classify(ex);

            // 4xx = expected client/domain errors — log at Warning, no stack trace
            // 5xx = unexpected server errors  — log at Error, with full stack trace
            if ((int)statusCode >= 500)
                _logger.LogError(ex, "Unhandled server error for {Method} {Path}", context.Request.Method, context.Request.Path);
            else
                _logger.LogWarning("{ExceptionType} on {Method} {Path}: {Message}", ex.GetType().Name, context.Request.Method, context.Request.Path, ex.Message);

            context.Response.ContentType = "application/json";
            context.Response.StatusCode = (int)statusCode;
            await context.Response.WriteAsync(JsonSerializer.Serialize(new { error = message }));
        }
    }

    private static (HttpStatusCode statusCode, string message) Classify(Exception ex) => ex switch
    {
        UnauthorizedAccessException => (HttpStatusCode.Unauthorized,           ex.Message),
        KeyNotFoundException        => (HttpStatusCode.NotFound,               ex.Message),
        InvalidOperationException   => (HttpStatusCode.Conflict,               ex.Message),
        ArgumentNullException       => (HttpStatusCode.BadRequest,             ex.Message),
        ArgumentException           => (HttpStatusCode.BadRequest,             ex.Message),
        NotSupportedException       => (HttpStatusCode.BadRequest,             ex.Message),
        _                           => (HttpStatusCode.InternalServerError,    "An unexpected error occurred. Please try again later.")
    };
}
