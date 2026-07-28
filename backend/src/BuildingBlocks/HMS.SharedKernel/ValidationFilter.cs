using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;

namespace HMS.SharedKernel;

public static class ValidationFilter
{
    public static RouteHandlerBuilder WithValidation<T>(this RouteHandlerBuilder builder)
    {
        return builder.AddEndpointFilter(async (context, next) =>
        {
            var arg = context.Arguments.OfType<T>().FirstOrDefault();
            if (arg is not null)
            {
                var results = new List<ValidationResult>();
                var isValid = Validator.TryValidateObject(arg, new ValidationContext(arg), results, validateAllProperties: true);
                if (!isValid)
                {
                    var errors = results.Select(r => r.ErrorMessage);
                    return TypedResults.BadRequest(ApiResponse<object>.Fail(string.Join("; ", errors)));
                }
            }
            return await next(context);
        });
    }
}
