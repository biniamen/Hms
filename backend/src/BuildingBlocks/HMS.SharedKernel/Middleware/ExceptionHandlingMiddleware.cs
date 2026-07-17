using System.ComponentModel.DataAnnotations;
using System.Net;
using System.Text.Json;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;

namespace HMS.SharedKernel.Middleware;

/// <summary>
/// Global exception handling middleware that catches all unhandled exceptions
/// and returns standardized JSON error responses.
/// </summary>
public class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;

    /// <summary>
    /// Map of exception types to HTTP status codes for known exception types.
    /// </summary>
    private static readonly Dictionary<Type, HttpStatusCode> ExceptionStatusMap = new()
    {
        [typeof(KeyNotFoundException)] = HttpStatusCode.NotFound,
        [typeof(ArgumentNullException)] = HttpStatusCode.BadRequest,
        [typeof(ArgumentException)] = HttpStatusCode.BadRequest,
        [typeof(ValidationException)] = HttpStatusCode.BadRequest,
        [typeof(InvalidOperationException)] = HttpStatusCode.Conflict,
        [typeof(UnauthorizedAccessException)] = HttpStatusCode.Forbidden,
        // Note: Add DbUpdateException handling in service projects that reference EF Core:
        // [typeof(DbUpdateConcurrencyException)] = HttpStatusCode.Conflict,
    };

    public ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
    {
        _next = next ?? throw new ArgumentNullException(nameof(next));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (OperationCanceledException)
        {
            // Client disconnected — log and return 499 (client closed request)
            _logger.LogInformation("Request was cancelled by the client: {Method} {Path}",
                context.Request.Method, context.Request.Path);
            context.Response.StatusCode = 499;
        }
        catch (Exception ex)
        {
            await HandleExceptionAsync(context, ex);
        }
    }

    private async Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        var statusCode = MapStatusCode(exception);
        var errorCode = MapErrorCode(exception);
        var requestId = context.TraceIdentifier;
        var path = context.Request.Path;
        var method = context.Request.Method;

        // Log at appropriate level based on severity
        if ((int)statusCode >= 500)
        {
            _logger.LogError(exception,
                "Unhandled exception processing {Method} {Path} | RequestId: {RequestId} | ErrorCode: {ErrorCode}",
                method, path, requestId, errorCode);
        }
        else
        {
            _logger.LogWarning(exception,
                "Handled application exception processing {Method} {Path} | RequestId: {RequestId} | ErrorCode: {ErrorCode}",
                method, path, requestId, errorCode);
        }

        var response = new
        {
            success = false,
            message = GetUserMessage(exception),
            data = (object?)null,
            statusCode = (int)statusCode,
            errorCode,
            requestId,
            timestamp = DateTime.UtcNow
        };

        context.Response.ContentType = "application/json";
        context.Response.StatusCode = (int)statusCode;

        var json = JsonSerializer.Serialize(response, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        });

        await context.Response.WriteAsync(json);
    }

    private static HttpStatusCode MapStatusCode(Exception exception)
    {
        var exceptionType = exception.GetType();

        // Check for known exception types (including inherited types)
        foreach (var (type, statusCode) in ExceptionStatusMap)
        {
            if (type.IsAssignableFrom(exceptionType))
                return statusCode;
        }

        // Handle nested exceptions (e.g., database constraint violation with inner exception)
        if (exception.InnerException != null)
        {
            return MapStatusCode(exception.InnerException);
        }

        return HttpStatusCode.InternalServerError;
    }

    private static string MapErrorCode(Exception exception) => exception switch
    {
        KeyNotFoundException => "RESOURCE_NOT_FOUND",
        ArgumentNullException => "ARGUMENT_NULL",
        ArgumentException => "INVALID_ARGUMENT",
        ValidationException => "VALIDATION_ERROR",
        InvalidOperationException => "INVALID_OPERATION",
        UnauthorizedAccessException => "ACCESS_DENIED",
        _ => "INTERNAL_ERROR"
    };

    private static string GetUserMessage(Exception exception) => exception switch
    {
        KeyNotFoundException => exception.Message ?? "The requested resource was not found.",
        ValidationException => exception.Message ?? "A validation error occurred.",
        _ when exception.Message.Contains("already exists", StringComparison.OrdinalIgnoreCase) =>
            "A record with the same key already exists.",
        _ => "An unexpected error occurred. Please try again later."
    };
}

/// <summary>
/// Extension method for registering the exception handling middleware.
/// </summary>
public static class ExceptionHandlingMiddlewareExtensions
{
    /// <summary>
    /// Adds the global exception handling middleware to the pipeline.
    /// Should be registered early (before other middleware) to catch all exceptions.
    /// </summary>
    public static IApplicationBuilder UseHmsExceptionHandling(this IApplicationBuilder app)
    {
        ArgumentNullException.ThrowIfNull(app);
        return app.UseMiddleware<ExceptionHandlingMiddleware>();
    }
}
