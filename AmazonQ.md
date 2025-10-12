# Implementation Guide: All Tasks Page (Issue #867)

## Overview
Add a temporary "All Tasks" page accessible from Settings to view all tasks as cards for debugging/testing purposes.

---

## Backend Implementation (.NET 8)

### 1. Create Endpoint in Tasks Controller

**File**: `Controllers/TasksController.cs` (or similar)

```csharp
[HttpGet("all")]
public async Task<IActionResult> GetAllTasks()
{
    var tasks = await _context.Tasks
        .OrderByDescending(t => t.StartTime ?? DateTime.MinValue)
        .ThenByDescending(t => t.CreatedAt)
        .ToListAsync();
    
    return Ok(tasks);
}
```

**Key Points**:
- Route: `GET /api/tasks/all`
- Order by `StartTime DESC` (nulls last), then `CreatedAt DESC`
- Return all task data needed for TaskCard component

---

## Frontend Implementation (Next.js + Tailwind)

### 2. Add Settings Navigation Button

**File**: `app/settings/page.tsx` (or components/Settings.tsx)

```tsx
<button 
  onClick={() => router.push('/all-tasks')}
  className="..."
>
  All Tasks (Temporary)
</button>
```

### 3. Create All Tasks Page

**File**: `app/all-tasks/page.tsx`

```tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import TaskCard from '@/components/TaskCard'; // Reuse existing component

export default function AllTasksPage() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();

  const fetchTasks = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/tasks/all');
      if (!res.ok) throw new Error('Failed to fetch tasks');
      const data = await res.json();
      setTasks(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  return (
    <div className="min-h-screen p-4">
      <header className="mb-4">
        <button onClick={() => router.back()}>← Back</button>
        <h1>All Tasks (Temporary)</h1>
      </header>

      {loading && <div className="spinner">Loading...</div>}
      
      {error && (
        <div className="error">
          <p>{error}</p>
          <button onClick={fetchTasks}>Retry</button>
        </div>
      )}

      {!loading && !error && tasks.length === 0 && (
        <p>No tasks yet</p>
      )}

      <div className="space-y-2">
        {tasks.map(task => (
          <TaskCard key={task.id} task={task} />
        ))}
      </div>
    </div>
  );
}
```

**Key Features**:
- Loading spinner during fetch
- Error handling with retry button
- Empty state message
- Reuses existing `TaskCard` component (same UI as Calendar)
- Back navigation to Settings

### 4. Optional: Add Pull-to-Refresh

```tsx
// Add to AllTasksPage component
const handleRefresh = async () => {
  await fetchTasks();
};

// In return JSX, wrap content with pull-to-refresh library or native gesture
```

---

## Testing Checklist

- [ ] Backend endpoint returns all tasks ordered correctly
- [ ] Settings button navigates to `/all-tasks`
- [ ] All Tasks page displays loading state
- [ ] Tasks render using identical TaskCard component
- [ ] Empty state shows "No tasks yet"
- [ ] Error state shows message + retry button
- [ ] Back button returns to Settings
- [ ] Pull-to-refresh works (if implemented)

---

## PR Guidelines

**Backend PR**: `feat(api): GET /api/tasks/all ✨`
- Add endpoint to TasksController
- Include ordering logic
- Test with various task datasets

**Frontend PR**: `feat(ui): All Tasks screen + settings entry 🧭`
- Add Settings navigation button
- Create `/all-tasks` page
- Implement loading/error/empty states
- Reuse TaskCard component

---

## Notes

- Keep "Temporary" label visible in UI to avoid user confusion
- No calendar component needed on this page
- Focus on minimal implementation for debugging/ops use
- Ensure TaskCard styling matches Calendar exactly (spacing, typography, labels)
