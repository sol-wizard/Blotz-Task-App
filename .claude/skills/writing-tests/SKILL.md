---
name: writing-tests
description: Use before writing, adding, or modifying any test in blotztask-test/.
---

# Writing Tests

## Step 1 — Is this test necessary?

Make your own judgment first: does this code contain non-obvious logic that could break silently, and does the test actually bring value to the project — or is it unnecessary?

- **If yes**, proceed.
- **If no**, do not refuse outright. Share your reasoning and let the dev respond. Write the test only if their response genuinely changes your judgment; then proceed.

## Step 2 — If it's necessary, follow these conventions

- **Framework**: xUnit + FluentAssertions + Testcontainers.MsSql. Run with `cd blotztask-test && dotnet test`.
- **Naming**: `Handle_<Scenario>_<ExpectedOutcome>` inside a `<Subject>Tests` class.
- **Structure**: AAA with inline `// Arrange` / `// Act` / `// Assert` comments. Seed data via `DataSeeder` — never depend on existing DB state.
- **No mocking**: tests run against a real SQL Server container via `DatabaseFixture`.
- **Assertions**: always include `because:` — it documents the rule.
spl
```csharp
result.Should().HaveCount(3, because: "only tasks within the UTC window are returned");
```