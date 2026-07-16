using Npgsql;

namespace HMS.SharedKernel;

public static class PostgresDatabaseBootstrapper
{
    public static async Task EnsureDatabaseExistsAsync(string connectionString)
    {
        var targetBuilder = new NpgsqlConnectionStringBuilder(connectionString);
        var databaseName = targetBuilder.Database;
        if (string.IsNullOrWhiteSpace(databaseName))
        {
            return;
        }

        var adminBuilder = new NpgsqlConnectionStringBuilder(connectionString)
        {
            Database = "postgres",
            Pooling = false
        };

        await using var connection = new NpgsqlConnection(adminBuilder.ConnectionString);
        await connection.OpenAsync();
        await using var existsCommand = new NpgsqlCommand(
            "select exists(select 1 from pg_database where datname = @database_name)",
            connection);
        existsCommand.Parameters.AddWithValue("database_name", databaseName);

        var exists = (bool)(await existsCommand.ExecuteScalarAsync() ?? false);
        if (exists)
        {
            return;
        }

        await using var createCommand = new NpgsqlCommand($"create database {QuoteIdentifier(databaseName)}", connection);
        await createCommand.ExecuteNonQueryAsync();
    }

    private static string QuoteIdentifier(string value) => "\"" + value.Replace("\"", "\"\"") + "\"";
}
