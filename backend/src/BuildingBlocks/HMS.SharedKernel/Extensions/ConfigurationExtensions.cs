using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace HMS.SharedKernel.Extensions;

/// <summary>
/// Extension methods for <see cref="IConfiguration"/> and <see cref="IServiceCollection"/>
/// for common HMS service registration patterns (without EF Core dependency).
/// </summary>
public static class ConfigurationExtensions
{
    /// <summary>
    /// Gets a required configuration value or throws a clear error.
    /// </summary>
    public static string RequireValue(this IConfiguration configuration, string key)
    {
        var value = configuration[key];
        if (string.IsNullOrWhiteSpace(value))
        {
            throw new InvalidOperationException(
                $"Required configuration '{key}' is missing. " +
                $"Set it via appsettings.json, environment variables, or user secrets.");
        }
        return value;
    }

    /// <summary>
    /// Registers HMS CORS policy from configuration.
    /// </summary>
    public static IServiceCollection AddHmsServiceDefaults(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        ArgumentNullException.ThrowIfNull(services);
        ArgumentNullException.ThrowIfNull(configuration);

        services.AddHmsCors(configuration);

        return services;
    }
}
