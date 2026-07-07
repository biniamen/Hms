FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
COPY . .
RUN dotnet restore "src/Services/Clinical/HMS.Clinical.Api/HMS.Clinical.Api.csproj"
RUN dotnet publish "src/Services/Clinical/HMS.Clinical.Api/HMS.Clinical.Api.csproj" -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:9.0
WORKDIR /app
COPY --from=build /app/publish .
EXPOSE 8080
ENTRYPOINT ["dotnet", "HMS.Clinical.Api.dll"]
