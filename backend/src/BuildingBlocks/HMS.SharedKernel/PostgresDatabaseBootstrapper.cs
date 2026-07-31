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

    public static async Task ResetLegacySchemaIfRequestedAsync(string connectionString, bool resetLegacySchema)
    {
        if (!resetLegacySchema)
        {
            return;
        }

        await using var connection = new NpgsqlConnection(connectionString);
        await connection.OpenAsync();

        var migrationCount = await ScalarLongAsync(
            connection,
            """
            select count(*)
            from information_schema.tables
            where table_schema = 'public'
              and table_name = '__EFMigrationsHistory'
            """);

        if (migrationCount > 0)
        {
            var appliedMigrations = await ScalarLongAsync(connection, "select count(*) from \"__EFMigrationsHistory\"");
            if (appliedMigrations > 0)
            {
                return;
            }
        }

        var tableCount = await ScalarLongAsync(
            connection,
            """
            select count(*)
            from information_schema.tables
            where table_schema = 'public'
              and table_type = 'BASE TABLE'
              and table_name <> '__EFMigrationsHistory'
            """);

        if (tableCount == 0)
        {
            return;
        }

        await using var resetCommand = new NpgsqlCommand(
            """
            drop schema public cascade;
            create schema public;
            """,
            connection);
        await resetCommand.ExecuteNonQueryAsync();
    }

    public static async Task ResetSchemaIfMigrationIsMissingAsync(
        string connectionString,
        bool resetLegacySchema,
        string requiredMigrationId,
        params string[] ownedTableNames)
    {
        if (!resetLegacySchema || string.IsNullOrWhiteSpace(requiredMigrationId) || ownedTableNames.Length == 0)
        {
            return;
        }

        await using var connection = new NpgsqlConnection(connectionString);
        await connection.OpenAsync();

        var ownedTables = string.Join(", ", ownedTableNames.Select(QuoteLiteral));
        var ownedTableCount = await ScalarLongAsync(
            connection,
            $"""
            select count(*)
            from information_schema.tables
            where table_schema = 'public'
              and table_type = 'BASE TABLE'
              and table_name in ({ownedTables})
            """);

        if (ownedTableCount == 0)
        {
            return;
        }

        var migrationHistoryTableCount = await ScalarLongAsync(
            connection,
            """
            select count(*)
            from information_schema.tables
            where table_schema = 'public'
              and table_name = '__EFMigrationsHistory'
            """);

        if (migrationHistoryTableCount > 0)
        {
            await using var migrationCommand = new NpgsqlCommand(
                "select count(*) from \"__EFMigrationsHistory\" where \"MigrationId\" = @migration_id",
                connection);
            migrationCommand.Parameters.AddWithValue("migration_id", requiredMigrationId);
            var migrationApplied = Convert.ToInt64(await migrationCommand.ExecuteScalarAsync() ?? 0) > 0;
            if (migrationApplied)
            {
                return;
            }
        }

        await using var resetCommand = new NpgsqlCommand(
            """
            drop schema public cascade;
            create schema public;
            """,
            connection);
        await resetCommand.ExecuteNonQueryAsync();
    }

    private static string QuoteIdentifier(string value) => "\"" + value.Replace("\"", "\"\"") + "\"";

    private static string QuoteLiteral(string value) => "'" + value.Replace("'", "''") + "'";

    private static async Task<long> ScalarLongAsync(NpgsqlConnection connection, string sql)
    {
        await using var command = new NpgsqlCommand(sql, connection);
        var value = await command.ExecuteScalarAsync();
        return Convert.ToInt64(value ?? 0);
    }
}
