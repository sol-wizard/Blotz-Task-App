using System.Text;
using System.Text.RegularExpressions;
using Microsoft.Data.SqlClient;

if (args.Length < 2)
{
    Console.Error.WriteLine("Usage: V2SqlRunner <EF migration SQL file> <expected migration ID> [...]");
    return 2;
}

var connectionString = Environment.GetEnvironmentVariable("BLOTZ_SQL_CONNECTION_STRING");
if (string.IsNullOrWhiteSpace(connectionString))
{
    Console.Error.WriteLine("BLOTZ_SQL_CONNECTION_STRING is required.");
    return 2;
}

var sqlPath = args[0];
if (!File.Exists(sqlPath))
{
    Console.Error.WriteLine($"SQL file does not exist: {sqlPath}");
    return 2;
}

await using var connection = new SqlConnection(connectionString);
await connection.OpenAsync();

await using (var prerequisite = connection.CreateCommand())
{
    prerequisite.CommandText = "SELECT OBJECT_ID(N'dbo.AppUsers', N'U')";
    if (await prerequisite.ExecuteScalarAsync() is null or DBNull)
    {
        Console.Error.WriteLine("Staging database does not contain dbo.AppUsers; refusing to apply V2 migration.");
        return 1;
    }
}

var batch = new StringBuilder();
var batchNumber = 0;

async Task ExecuteBatchAsync()
{
    if (string.IsNullOrWhiteSpace(batch.ToString()))
    {
        batch.Clear();
        return;
    }

    batchNumber++;
    await using var command = connection.CreateCommand();
    command.CommandText = batch.ToString();
    command.CommandTimeout = 120;
    try
    {
        await command.ExecuteNonQueryAsync();
    }
    catch (SqlException ex)
    {
        Console.Error.WriteLine($"V2 migration SQL failed in batch {batchNumber}: {ex.Message}");
        throw;
    }
    batch.Clear();
}

foreach (var line in File.ReadLines(sqlPath))
{
    if (Regex.IsMatch(line, @"^\s*GO\s*$", RegexOptions.IgnoreCase))
    {
        await ExecuteBatchAsync();
    }
    else
    {
        batch.AppendLine(line);
    }
}

await ExecuteBatchAsync();
foreach (var migrationId in args.Skip(1))
{
    await using var verification = connection.CreateCommand();
    verification.CommandText = "SELECT COUNT(*) FROM [dbo].[__EFMigrationsHistory] WHERE [MigrationId] = @migrationId";
    verification.Parameters.AddWithValue("@migrationId", migrationId);
    if ((int)(await verification.ExecuteScalarAsync() ?? 0) != 1)
    {
        Console.Error.WriteLine($"V2 migration {migrationId} was not recorded in __EFMigrationsHistory.");
        return 1;
    }
}

Console.WriteLine($"Executed {batchNumber} SQL batches; verified {args.Length - 1} V2 migrations.");
return 0;
