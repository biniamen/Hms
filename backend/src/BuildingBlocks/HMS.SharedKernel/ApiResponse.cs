namespace HMS.SharedKernel;

/// <summary>
/// Standard API response envelope for all HMS service responses.
/// Provides a consistent contract between backend services and the frontend.
/// </summary>
/// <typeparam name="T">Type of the response payload.</typeparam>
/// <param name="Success">Indicates whether the request succeeded.</param>
/// <param name="Message">Human-readable status or error message.</param>
/// <param name="Data">The response payload, if successful.</param>
/// <param name="StatusCode">Recommended HTTP status code for the response.</param>
public sealed record ApiResponse<T>(
    bool Success,
    string Message,
    T? Data,
    int StatusCode = 200)
{
    /// <summary>Creates a successful response with data.</summary>
    public static ApiResponse<T> Ok(T data, string message = "Success") =>
        new(true, message, data, 200);

    /// <summary>Creates a successful response without data.</summary>
    public static ApiResponse<T> Created(T data, string message = "Created") =>
        new(true, message, data, 201);

    /// <summary>Creates a failure response with an error message.</summary>
    public static ApiResponse<T> Fail(string message, int statusCode = 400) =>
        new(false, message, default, statusCode);

    /// <summary>Creates a not-found response.</summary>
    public static ApiResponse<T> NotFound(string message = "Resource not found.") =>
        new(false, message, default, 404);

    /// <summary>Creates a conflict response.</summary>
    public static ApiResponse<T> Conflict(string message) =>
        new(false, message, default, 409);

    /// <summary>Creates an internal server error response.</summary>
    public static ApiResponse<T> Error(string message = "An internal error occurred.") =>
        new(false, message, default, 500);
}

/// <summary>
/// Non-generic helper for creating ApiResponse instances when the type is inferred.
/// </summary>
public static class ApiResponse
{
    public static ApiResponse<T> Ok<T>(T data, string message = "Success") =>
        ApiResponse<T>.Ok(data, message);

    public static ApiResponse<T> Created<T>(T data, string message = "Created") =>
        ApiResponse<T>.Created(data, message);

    public static ApiResponse<T> Fail<T>(string message, int statusCode = 400) =>
        ApiResponse<T>.Fail(message, statusCode);

    public static ApiResponse<T> NotFound<T>(string message = "Resource not found.") =>
        ApiResponse<T>.NotFound(message);

    public static ApiResponse<T> Error<T>(string message = "An internal error occurred.") =>
        ApiResponse<T>.Error(message);
}
