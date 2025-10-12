# Implementation Guide: All Tasks Page (Issue #867)

## Overview
Add a temporary "All Tasks" page accessible from Settings to view all tasks as cards for debugging/testing purposes.

---

## Backend Implementation (.NET 8)

### 1. Create Query Handler

**File**: `blotztask-api/Modules/Tasks/Queries/Tasks/GetAllTasks.cs`

```csharp
using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Labels.DTOs;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Modules.Tasks.Queries.Tasks;

public class GetAllTasksQuery
{
    public required Guid UserId { get; init; }
}

public class GetAllTasksQueryHandler(BlotzTaskDbContext db, ILogger<GetAllTasksQueryHandler> logger)
{
    public async Task<List<AllTaskItemDto>> Handle(GetAllTasksQuery query, CancellationToken ct = default)
    {
        logger.LogInformation("Fetching all tasks for user {UserId}", query.UserId);

        var tasks = await db.TaskItems
            .Where(t => t.UserId == query.UserId)
            .OrderByDescending(t => t.StartTime ?? DateTimeOffset.MinValue)
            .ThenByDescending(t => t.CreatedAt)
            .Select(task => new AllTaskItemDto
            {
                Id = task.Id,
                Title = task.Title,
                Description = task.Description,
                StartTime = task.StartTime,
                EndTime = task.EndTime,
                IsDone = task.IsDone,
                CreatedAt = task.CreatedAt,
                Label = task.Label != null ? new LabelDto
                {
                    LabelId = task.Label.LabelId,
                    Name = task.Label.Name,
                    Color = task.Label.Color
                } : null
            })
            .ToListAsync(ct);

        logger.LogInformation("Successfully fetched {TaskCount} tasks for user {UserId}", tasks.Count, query.UserId);
        return tasks;
    }
}

public class AllTaskItemDto
{
    public int Id { get; set; }
    public required string Title { get; set; }
    public string? Description { get; set; }
    public DateTimeOffset? StartTime { get; set; }
    public DateTimeOffset? EndTime { get; set; }
    public bool IsDone { get; set; }
    public DateTime CreatedAt { get; set; }
    public LabelDto? Label { get; set; }
}
```

### 2. Add Endpoint to Controller

**File**: `blotztask-api/Modules/Tasks/Controllers/TaskController.cs`

Add to constructor parameters:
```csharp
GetAllTasksQueryHandler getAllTasksQueryHandler
```

Add endpoint method:
```csharp
[HttpGet("all")]
public async Task<IEnumerable<AllTaskItemDto>> GetAllTasks(CancellationToken ct)
{
    if (!HttpContext.Items.TryGetValue("UserId", out var userIdObj) || userIdObj is not Guid userId)
        throw new UnauthorizedAccessException("Could not find valid user id from Http Context");

    var query = new GetAllTasksQuery { UserId = userId };
    return await getAllTasksQueryHandler.Handle(query, ct);
}
```

**Key Points**:
- Route: `GET /api/task/all`
- Order by `StartTime DESC` (nulls last), then `CreatedAt DESC`
- Returns all task data needed for TaskCard component
- Follows existing CQRS pattern with Query Handler

---

## Mobile Frontend Implementation (React Native + Expo Router)

### 2. Add Settings Navigation Button

**File**: `blotztask-mobile/src/feature/settings/settings-screen.tsx`

```tsx
const goToAllTasks = () => {
  router.push("/(protected)/all-tasks");
};

// Add button in return JSX
<Button mode="outlined" style={{ marginTop: 16 }} onPress={goToAllTasks}>
  All Tasks (Temporary)
</Button>
```

### 3. Create All Tasks Screen

**File**: `blotztask-mobile/src/app/(protected)/all-tasks.tsx`

```tsx
import { useState, useEffect } from "react";
import { View, ScrollView, RefreshControl } from "react-native";
import { Text, Button, ActivityIndicator } from "react-native-paper";
import { useRouter } from "expo-router";
import { TaskCard } from "@/feature/calendar/components/task-card";
import { taskService } from "@/shared/services/task-service";

export default function AllTasksScreen() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const router = useRouter();

  const fetchTasks = async () => {
    try {
      setError(null);
      const data = await taskService.getAllTasks();
      setTasks(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchTasks();
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View className="flex-1">
      <View className="p-4 border-b border-gray-200">
        <Text variant="headlineMedium">All Tasks (Temporary)</Text>
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {error && (
          <View className="p-4">
            <Text className="text-red-500 mb-2">{error}</Text>
            <Button mode="outlined" onPress={fetchTasks}>
              Retry
            </Button>
          </View>
        )}

        {!error && tasks.length === 0 && (
          <View className="p-4">
            <Text>No tasks yet</Text>
          </View>
        )}

        <View className="p-2">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
```

### 4. Add Service Method

**File**: `blotztask-mobile/src/shared/services/task-service.ts`

```ts
async getAllTasks() {
  const response = await this.apiClient.get("/tasks/all");
  return response.data;
}
```

---

## Testing Checklist

- [ ] Backend endpoint returns all tasks ordered correctly
- [ ] Settings button navigates to all-tasks screen
- [ ] All Tasks screen displays loading spinner
- [ ] Tasks render using identical TaskCard component
- [ ] Empty state shows "No tasks yet"
- [ ] Error state shows message + retry button
- [ ] Pull-to-refresh works
- [ ] Back navigation returns to Settings

---

## PR Guidelines

**Backend PR**: `feat(api): GET /api/tasks/all ✨`
- Add endpoint to TasksController
- Include ordering logic
- Test with various task datasets

**Mobile PR**: `feat(mobile): All Tasks screen + settings entry 🧭`
- Add Settings navigation button
- Create `all-tasks.tsx` screen
- Add service method
- Implement loading/error/empty states
- Reuse TaskCard component

---

## Notes

- Keep "Temporary" label visible in UI to avoid user confusion
- No calendar component needed on this screen
- Focus on minimal implementation for debugging/ops use
- Ensure TaskCard styling matches Calendar exactly (spacing, typography, labels)
- Uses existing TaskCard from `@/feature/calendar/components/task-card`
