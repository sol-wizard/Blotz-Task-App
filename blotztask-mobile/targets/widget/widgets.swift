import WidgetKit
import SwiftUI
import AppIntents

struct WidgetTask: Identifiable, Codable, Hashable {
    let id: String
    let title: String
    let isDone: Bool
    let endTime: String?
}

struct TodayTasksEntry: TimelineEntry {
    let date: Date
    let tasks: [WidgetTask]
    let configuration: ConfigurationAppIntent
}

struct Provider: AppIntentTimelineProvider {
    func placeholder(in context: Context) -> TodayTasksEntry {
        TodayTasksEntry(date: Date(), tasks: [], configuration: ConfigurationAppIntent())
    }

    func snapshot(for configuration: ConfigurationAppIntent, in context: Context) async -> TodayTasksEntry {
        // In snapshot, provide a quick sample of tasks
        let sample = [
            WidgetTask(id: "1", title: "Buy groceries", isDone: false, endTime: nil),
            WidgetTask(id: "2", title: "Finish report", isDone: true, endTime: nil),
            WidgetTask(id: "3", title: "Call Alice", isDone: false, endTime: nil)
        ]
        return TodayTasksEntry(date: Date(), tasks: sample, configuration: configuration)
    }
    
    func timeline(for configuration: ConfigurationAppIntent, in context: Context) async -> Timeline<TodayTasksEntry> {
        // Load tasks from shared storage if needed. For now, create a single entry with current tasks.
        // You can later replace this with App Group UserDefaults or other shared storage.
        let tasks = await loadTodayTasks()
        let entry = TodayTasksEntry(date: Date(), tasks: tasks, configuration: configuration)
        // Refresh in 15 minutes
        let nextRefresh = Calendar.current.date(byAdding: .minute, value: 15, to: Date()) ?? Date().addingTimeInterval(900)
        return Timeline(entries: [entry], policy: .after(nextRefresh))
    }
    
    private func loadTodayTasks() async -> [WidgetTask] {
        // Read tasks from App Group shared UserDefaults as JSON string
        let appGroupId = "group.com.yourcompany.blotztask"
        let tasksKey = "today_tasks"
        guard let defaults = UserDefaults(suiteName: appGroupId),
              let json = defaults.string(forKey: tasksKey),
              let data = json.data(using: .utf8) else {
            return []
        }
        do {
            return try JSONDecoder().decode([WidgetTask].self, from: data)
        } catch {
            return []
        }
    }
}

struct widgetEntryView : View {
    var entry: TodayTasksEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Today").font(.headline)

            if entry.tasks.isEmpty {
                Text("Open the app to sync tasks")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            } else {
                ForEach(entry.tasks.prefix(3)) { task in
                    HStack(spacing: 8) {
                        Button(intent: ToggleTaskDoneIntent(taskID: task.id)) {
                            Image(systemName: task.isDone ? "checkmark.circle.fill" : "circle")
                        }
                        .buttonStyle(.plain)
                        Text(task.title).lineLimit(1)
                        Spacer()
                    }
                    .font(.subheadline)
                }

                if entry.tasks.count > 3 {
                    Text("+ \(entry.tasks.count - 3) more")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
            }
            Spacer()
        }
    }
}

struct widget: Widget {
    let kind: String = "widget"

    var body: some WidgetConfiguration {
        AppIntentConfiguration(kind: kind, intent: ConfigurationAppIntent.self, provider: Provider()) { entry in
            widgetEntryView(entry: entry)
                .containerBackground(.fill.tertiary, for: .widget)
        }
    }
}

extension ConfigurationAppIntent {
    fileprivate static var smiley: ConfigurationAppIntent {
        let intent = ConfigurationAppIntent()
        intent.favoriteEmoji = "😀"
        return intent
    }
    
    fileprivate static var starEyes: ConfigurationAppIntent {
        let intent = ConfigurationAppIntent()
        intent.favoriteEmoji = "🤩"
        return intent
    }
}

#Preview("Today Tasks - Small", as: .systemSmall) {
    widget()
} timeline: {
    TodayTasksEntry(date: .now, tasks: [
        WidgetTask(id: "1", title: "Buy groceries", isDone: false, endTime: nil),
        WidgetTask(id: "2", title: "Finish report", isDone: true, endTime: nil)
    ], configuration: .smiley)
}
#Preview("Today Tasks - Medium", as: .systemMedium) {
    widget()
} timeline: {
    TodayTasksEntry(date: .now, tasks: [
        WidgetTask(id: "1", title: "Buy groceries", isDone: false, endTime: nil),
        WidgetTask(id: "2", title: "Finish report", isDone: true, endTime: nil),
        WidgetTask(id: "3", title: "Call Alice", isDone: false, endTime: nil),
        WidgetTask(id: "4", title: "Plan weekend", isDone: false, endTime: nil)
    ], configuration: .starEyes)
}

