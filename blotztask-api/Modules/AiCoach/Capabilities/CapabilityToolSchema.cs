using System.Reflection;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.Json.Serialization;
using BlotzTask.Modules.AiCoach.Domain;
using BlotzTask.Modules.AiCoach.ModelTurn;
using BlotzTask.Modules.AiCoach.Modes;
using BlotzTask.Modules.AiCoach.StateMachine;

namespace BlotzTask.Modules.AiCoach.Capabilities;

public sealed record ModelToolSchema(
    CapabilityId CapabilityId,
    int CapabilityVersion,
    int InputSchemaVersion,
    string Name,
    string Description,
    JsonElement InputSchema);

public interface ICapabilitySchemaGenerator
{
    JsonElement Generate(Type inputType);
}

public interface ICapabilityToolSchemaRegistry
{
    ModelToolSchema Get(CapabilityId capabilityId);

    IReadOnlyList<ModelToolSchema> GetModelToolset(
        AiCoachModeDefinition mode,
        ConversationState state,
        ArtifactType? currentArtifactType);
}

public interface IModelToolsetProjector
{
    IReadOnlyList<ModelToolSchema> Project(
        AiCoachModeDefinition mode,
        ConversationState state,
        ArtifactType? currentArtifactType,
        ModelPurpose purpose,
        TurnObjectiveKey objective);
}

public sealed class ModelToolsetProjector : IModelToolsetProjector
{
    public IReadOnlyList<ModelToolSchema> Project(
        AiCoachModeDefinition mode,
        ConversationState state,
        ArtifactType? currentArtifactType,
        ModelPurpose purpose,
        TurnObjectiveKey objective)
    {
        if (purpose == ModelPurpose.Clarification
            && objective == TurnObjectiveKey.ClarifyOneCoreRequirement)
            return [];

        throw new ModelTurnViolationException("toolset_projection_not_registered");
    }
}

public static class CapabilityJsonContract
{
    public static JsonSerializerOptions Options { get; } = CreateOptions();

    private static JsonSerializerOptions CreateOptions()
    {
        var options = new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            PropertyNameCaseInsensitive = false,
            UnmappedMemberHandling = JsonUnmappedMemberHandling.Disallow
        };
        options.Converters.Add(new JsonStringEnumConverter(JsonNamingPolicy.SnakeCaseLower));
        return options;
    }
}

public sealed class ReflectionCapabilitySchemaGenerator : ICapabilitySchemaGenerator
{
    private readonly NullabilityInfoContext _nullability = new();

    public JsonElement Generate(Type inputType)
    {
        var schema = BuildSchema(inputType, new HashSet<Type>());
        return JsonSerializer.SerializeToElement(schema, CapabilityJsonContract.Options);
    }

    private JsonNode BuildSchema(Type type, HashSet<Type> path)
    {
        var nullableType = Nullable.GetUnderlyingType(type);
        if (nullableType is not null)
            return BuildSchema(nullableType, path);

        if (type == typeof(string) || type == typeof(char))
            return new JsonObject { ["type"] = "string" };
        if (type == typeof(Guid))
            return new JsonObject { ["type"] = "string", ["format"] = "uuid" };
        if (type == typeof(DateTime) || type == typeof(DateTimeOffset))
            return new JsonObject { ["type"] = "string", ["format"] = "date-time" };
        if (type == typeof(DateOnly))
            return new JsonObject { ["type"] = "string", ["format"] = "date" };
        if (type == typeof(TimeOnly))
            return new JsonObject { ["type"] = "string", ["format"] = "time" };
        if (type == typeof(bool))
            return new JsonObject { ["type"] = "boolean" };
        if (type.IsEnum)
        {
            var values = new JsonArray();
            foreach (var value in Enum.GetValues(type).Cast<Enum>())
                values.Add(JsonNamingPolicy.SnakeCaseLower.ConvertName(value.ToString()));
            return new JsonObject { ["type"] = "string", ["enum"] = values };
        }
        if (IsInteger(type))
            return new JsonObject { ["type"] = "integer" };
        if (IsNumber(type))
            return new JsonObject { ["type"] = "number" };

        var elementType = GetEnumerableElementType(type);
        if (elementType is not null)
            return new JsonObject
            {
                ["type"] = "array",
                ["items"] = BuildSchema(elementType, path)
            };

        if (!path.Add(type))
            throw new InvalidOperationException($"Capability input contract '{type.Name}' contains a recursive type.");

        var properties = new JsonObject();
        var required = new JsonArray();
        foreach (var property in type.GetProperties(BindingFlags.Public | BindingFlags.Instance)
                     .Where(property => property.GetMethod is not null)
                     .OrderBy(property => property.Name, StringComparer.Ordinal))
        {
            var name = CapabilityJsonContract.Options.PropertyNamingPolicy!.ConvertName(property.Name);
            properties[name] = BuildSchema(property.PropertyType, path);
            if (IsRequired(property))
                required.Add(name);
        }
        path.Remove(type);

        var result = new JsonObject
        {
            ["type"] = "object",
            ["properties"] = properties,
            ["additionalProperties"] = false
        };
        if (required.Count > 0)
            result["required"] = required;
        return result;
    }

    private bool IsRequired(PropertyInfo property) =>
        property.PropertyType.IsValueType
            ? Nullable.GetUnderlyingType(property.PropertyType) is null
            : _nullability.Create(property).ReadState == NullabilityState.NotNull;

    private static bool IsInteger(Type type) =>
        type == typeof(byte) || type == typeof(sbyte)
        || type == typeof(short) || type == typeof(ushort)
        || type == typeof(int) || type == typeof(uint)
        || type == typeof(long) || type == typeof(ulong);

    private static bool IsNumber(Type type) =>
        type == typeof(float) || type == typeof(double) || type == typeof(decimal);

    private static Type? GetEnumerableElementType(Type type)
    {
        if (type == typeof(string)) return null;
        if (type.IsArray) return type.GetElementType();
        return type.GetInterfaces()
            .Append(type)
            .FirstOrDefault(candidate => candidate.IsGenericType
                && candidate.GetGenericTypeDefinition() == typeof(IEnumerable<>))
            ?.GetGenericArguments()[0];
    }
}

public sealed class CapabilityToolSchemaRegistry(
    ICapabilityRegistry capabilities,
    ICapabilitySchemaGenerator generator) : ICapabilityToolSchemaRegistry
{
    private readonly IReadOnlyDictionary<CapabilityId, ModelToolSchema> _schemas = Build(capabilities, generator);

    public ModelToolSchema Get(CapabilityId capabilityId) =>
        _schemas.TryGetValue(capabilityId, out var schema)
            ? schema
            : throw new KeyNotFoundException($"Capability tool schema '{capabilityId}' is not registered.");

    public IReadOnlyList<ModelToolSchema> GetModelToolset(
        AiCoachModeDefinition mode,
        ConversationState state,
        ArtifactType? currentArtifactType) =>
        capabilities.GetModelCapabilities(mode, state, currentArtifactType)
            .Select(definition => Get(definition.Id))
            .ToArray();

    private static IReadOnlyDictionary<CapabilityId, ModelToolSchema> Build(
        ICapabilityRegistry capabilities,
        ICapabilitySchemaGenerator generator) =>
        capabilities.All.ToDictionary(
            definition => definition.Id,
            definition => new ModelToolSchema(
                definition.Id,
                definition.CapabilityVersion,
                definition.InputSchemaVersion,
                definition.ToolName,
                definition.Description,
                generator.Generate(definition.InputType)));
}

public interface ICapabilityArgumentBinder
{
    object Bind(CapabilityDefinition definition, JsonElement arguments);
}

public interface ICapabilitySchemaValidator
{
    void Validate(JsonElement value, JsonElement schema);
}

public sealed class CapabilitySchemaValidator : ICapabilitySchemaValidator
{
    public void Validate(JsonElement value, JsonElement schema) => Validate(value, schema, "$");

    private static void Validate(JsonElement value, JsonElement schema, string path)
    {
        var expectedType = schema.GetProperty("type").GetString();
        if (!MatchesType(value, expectedType))
            throw new JsonException($"Capability argument '{path}' must be '{expectedType}'.");

        if (schema.TryGetProperty("enum", out var allowed)
            && !allowed.EnumerateArray().Any(item => item.ValueEquals(value.GetString())))
            throw new JsonException($"Capability argument '{path}' contains an unsupported value.");

        if (expectedType == "array")
        {
            var itemSchema = schema.GetProperty("items");
            var index = 0;
            foreach (var item in value.EnumerateArray())
                Validate(item, itemSchema, $"{path}[{index++}]");
            return;
        }

        if (expectedType != "object") return;

        var propertySchemas = schema.GetProperty("properties");
        if (schema.TryGetProperty("required", out var required))
        {
            foreach (var property in required.EnumerateArray())
            {
                var name = property.GetString()!;
                if (!value.TryGetProperty(name, out _))
                    throw new JsonException($"Capability argument '{path}.{name}' is required.");
            }
        }

        foreach (var property in value.EnumerateObject())
        {
            if (!propertySchemas.TryGetProperty(property.Name, out var propertySchema))
                throw new JsonException($"Capability argument '{path}.{property.Name}' is not allowed.");
            Validate(property.Value, propertySchema, $"{path}.{property.Name}");
        }
    }

    private static bool MatchesType(JsonElement value, string? expectedType) => expectedType switch
    {
        "object" => value.ValueKind == JsonValueKind.Object,
        "array" => value.ValueKind == JsonValueKind.Array,
        "string" => value.ValueKind == JsonValueKind.String,
        "boolean" => value.ValueKind is JsonValueKind.True or JsonValueKind.False,
        "integer" => value.ValueKind == JsonValueKind.Number && value.TryGetInt64(out _),
        "number" => value.ValueKind == JsonValueKind.Number,
        _ => false
    };
}

public sealed class CapabilityArgumentBinder(
    ICapabilityToolSchemaRegistry schemas,
    ICapabilitySchemaValidator validator) : ICapabilityArgumentBinder
{
    public object Bind(CapabilityDefinition definition, JsonElement arguments)
    {
        validator.Validate(arguments, schemas.Get(definition.Id).InputSchema);
        return JsonSerializer.Deserialize(arguments, definition.InputType, CapabilityJsonContract.Options)
            ?? throw new JsonException($"Capability '{definition.Id}' input could not be deserialized.");
    }
}
