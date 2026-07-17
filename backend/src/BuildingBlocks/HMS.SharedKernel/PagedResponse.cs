using HMS.SharedKernel.Pagination;

namespace HMS.SharedKernel;

/// <summary>
/// Wraps paginated data with metadata about the page, total count, and navigation.
/// </summary>
/// <typeparam name="T">Type of the items in the page.</typeparam>
public sealed record PagedResponse<T>
{
    /// <summary>The items on the current page.</summary>
    public IReadOnlyList<T> Items { get; init; } = [];

    /// <summary>Total number of items across all pages.</summary>
    public int TotalCount { get; init; }

    /// <summary>Total number of pages.</summary>
    public int TotalPages { get; init; }

    /// <summary>Current page number (1-based).</summary>
    public int Page { get; init; } = 1;

    /// <summary>Number of items per page.</summary>
    public int PageSize { get; init; } = 20;

    /// <summary>Whether there is a previous page.</summary>
    public bool HasPreviousPage => Page > 1;

    /// <summary>Whether there is a next page.</summary>
    public bool HasNextPage => Page < TotalPages;

    /// <summary>Field used for sorting, if any.</summary>
    public string? SortBy { get; init; }

    /// <summary>Sort direction ("asc" or "desc").</summary>
    public string? SortDirection { get; init; }

    /// <summary>Search term used for filtering, if any.</summary>
    public string? Search { get; init; }

    /// <summary>
    /// Creates a PagedResponse from an already-materialized list with total count.
    /// </summary>
    public static PagedResponse<T> Create(
        IReadOnlyList<T> items,
        int totalCount,
        PagedRequest request)
    {
        return new PagedResponse<T>
        {
            Items = items,
            TotalCount = totalCount,
            Page = request.Page,
            PageSize = request.PageSize,
            TotalPages = (int)Math.Ceiling(totalCount / (double)Math.Max(1, request.PageSize)),
            SortBy = request.SortBy,
            SortDirection = request.SortDirection,
            Search = request.Search
        };
    }

    /// <summary>
    /// Converts a full list into a paged response by slicing it.
    /// Useful for in-memory data or when the data source doesn't support paginated queries.
    /// </summary>
    public static PagedResponse<T> FromList(
        IReadOnlyList<T> allItems,
        PagedRequest request)
    {
        var totalCount = allItems.Count;
        var items = allItems
            .Skip(request.Skip)
            .Take(request.PageSize)
            .ToList();

        return Create(items.AsReadOnly(), totalCount, request);
    }

    /// <summary>
    /// Maps the items in this response to a different type.
    /// </summary>
    public PagedResponse<TTarget> Map<TTarget>(Func<T, TTarget> selector)
    {
        return new PagedResponse<TTarget>
        {
            Items = Items.Select(selector).ToList(),
            TotalCount = TotalCount,
            TotalPages = TotalPages,
            Page = Page,
            PageSize = PageSize,
            SortBy = SortBy,
            SortDirection = SortDirection,
            Search = Search
        };
    }

    /// <summary>
    /// Converts this paged response into the standard API envelope.
    /// </summary>
    public ApiResponse<PagedResponse<T>> ToApiResponse(string message = "Success") =>
        ApiResponse<PagedResponse<T>>.Ok(this, message);
}
