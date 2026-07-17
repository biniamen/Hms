using System.Linq.Expressions;

namespace HMS.SharedKernel.Pagination;

/// <summary>
/// Standard request model for paginated, sorted, filtered, and searchable endpoints.
/// Bind via query string: ?page=1&pageSize=20&sortBy=name&sortDirection=asc&search=term
/// </summary>
public class PagedRequest
{
    private const int MaxPageSize = 100;
    private int _pageSize = 20;

    /// <summary>Page number (1-based). Default: 1.</summary>
    public int Page { get; set; } = 1;

    /// <summary>Items per page. Default: 20, Max: 100.</summary>
    public int PageSize
    {
        get => _pageSize;
        set => _pageSize = Math.Clamp(value, 1, MaxPageSize);
    }

    /// <summary>Field name to sort by (e.g., "createdAtUtc", "lastName").</summary>
    public string? SortBy { get; set; }

    /// <summary>Sort direction: "asc" or "desc". Default: "asc".</summary>
    public string SortDirection { get; set; } = "asc";

    /// <summary>Free-text search term for filtering results.</summary>
    public string? Search { get; set; }

    /// <summary>Returns the number of records to skip for SQL OFFSET.</summary>
    public int Skip => (Page - 1) * PageSize;

    /// <summary>Returns whether the sort direction is descending.</summary>
    public bool IsDescending =>
        string.Equals(SortDirection, "desc", StringComparison.OrdinalIgnoreCase);
}

/// <summary>
/// Static helper for creating PagedRequest instances.
/// </summary>
public static class PagedRequestHelper
{
    public static PagedRequest Default() => new();
    public static PagedRequest WithPage(int page) => new() { Page = Math.Max(1, page) };
    public static PagedRequest All(int maxPageSize = 100) => new() { Page = 1, PageSize = maxPageSize };
}
