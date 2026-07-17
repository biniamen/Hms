using System.Linq.Expressions;

namespace HMS.SharedKernel.Extensions;

/// <summary>
/// Extension methods for <see cref="IQueryable{T}"/> and <see cref="IEnumerable{T}"/>
/// supporting common data access patterns like pagination and filtering.
/// Note: For async EF Core extensions (CountAsync, ToListAsync), add the
/// Microsoft.EntityFrameworkCore package to the consuming project.
/// </summary>
public static class QueryableExtensions
{
    /// <summary>
    /// Applies pagination (Skip/Take) to a query.
    /// </summary>
    public static IQueryable<T> Paginate<T>(this IQueryable<T> query, int page, int pageSize)
    {
        ArgumentNullException.ThrowIfNull(query);
        var safePage = Math.Max(1, page);
        var safeSize = Math.Clamp(pageSize, 1, 100);
        return query.Skip((safePage - 1) * safeSize).Take(safeSize);
    }

    /// <summary>
    /// Applies sorting to a query by a property name string.
    /// Prefix with "-" for descending (e.g., "-createdAtUtc").
    /// </summary>
    public static IQueryable<T> SortBy<T>(this IQueryable<T> query, string? sortBy, string defaultSortBy = "createdAtUtc")
    {
        ArgumentNullException.ThrowIfNull(query);

        var propertyName = sortBy ?? defaultSortBy;
        var descending = false;

        if (propertyName.StartsWith('-'))
        {
            descending = true;
            propertyName = propertyName[1..];
        }

        // Convert to PascalCase for reflection
        propertyName = string.Concat(propertyName[..1].ToUpperInvariant(), propertyName[1..]);

        var parameter = Expression.Parameter(typeof(T), "x");
        var property = Expression.PropertyOrField(parameter, propertyName);
        var lambda = Expression.Lambda(property, parameter);

        var methodName = descending ? "OrderByDescending" : "OrderBy";
        var resultExpression = Expression.Call(
            typeof(Queryable),
            methodName,
            [typeof(T), property.Type],
            query.Expression,
            Expression.Quote(lambda));

        return query.Provider.CreateQuery<T>(resultExpression);
    }

    /// <summary>
    /// Applies a filter only if the search term is not null/empty.
    /// </summary>
    public static IQueryable<T> WhereIf<T>(
        this IQueryable<T> query,
        string? search,
        Expression<Func<T, bool>> predicate)
    {
        ArgumentNullException.ThrowIfNull(query);
        ArgumentNullException.ThrowIfNull(predicate);
        return string.IsNullOrWhiteSpace(search) ? query : query.Where(predicate);
    }

    /// <summary>
    /// Applies a filter only if the condition is true.
    /// </summary>
    public static IQueryable<T> WhereIf<T>(
        this IQueryable<T> query,
        bool condition,
        Expression<Func<T, bool>> predicate)
    {
        ArgumentNullException.ThrowIfNull(query);
        ArgumentNullException.ThrowIfNull(predicate);
        return condition ? query.Where(predicate) : query;
    }

    /// <summary>
    /// Applies pagination to an in-memory list.
    /// </summary>
    public static IEnumerable<T> Paginate<T>(this IEnumerable<T> source, int page, int pageSize)
    {
        ArgumentNullException.ThrowIfNull(source);
        var safePage = Math.Max(1, page);
        var safeSize = Math.Clamp(pageSize, 1, 100);
        return source.Skip((safePage - 1) * safeSize).Take(safeSize);
    }

    /// <summary>
    /// Applies a free-text search filter (case-insensitive) across specified string properties.
    /// </summary>
    public static IEnumerable<T> Search<T>(this IEnumerable<T> source, string? search, params Func<T, string?>[] fieldSelectors)
    {
        ArgumentNullException.ThrowIfNull(source);
        if (string.IsNullOrWhiteSpace(search))
            return source;

        var term = search.Trim().ToLowerInvariant();
        return source.Where(item =>
            fieldSelectors.Any(selector =>
            {
                var value = selector(item);
                return value != null && value.Contains(term, StringComparison.OrdinalIgnoreCase);
            }));
    }
}
