import WidgetKit
import SwiftUI

// MARK: - Model
// ✅ 推荐先用 String? 接 endTime，避免 decode Date 失败导致 tasks 全空
struct WidgetTask: Identifiable, Codable, Hashable {
    let id: String
    let title: String
    let isDone: Bool
    let endTime: String?
}

// MARK: - Entry
struct TodayTasksEntry: TimelineEntry {
    let date: Date
    let tasks: [WidgetTask]
}

// MARK: - Provider
struct TodayTasksProvider: TimelineProvider {
    private let appGroupId = "group.com.yourcompany.blotztask" // TODO: 改成你的 App Group
    private let tasksKey = "today_tasks"

    func placeholder(in context: Context) -> TodayTasksEntry {
        TodayTasksEntry(date: Date(), tasks: [
            WidgetTask(id: "1", title: "Example task", isDone: false, endTime: nil),
            WidgetTask(id: "2", title: "Another task", isDone: true, endTime: nil),
        ])
    }

    func getSnapshot(in context: Context, completion: @escaping (TodayTasksEntry) -> Void) {
        completion(TodayTasksEntry(date: Date(), tasks: loadTasks()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<TodayTasksEntry>) -> Void) {
        let entry = TodayTasksEntry(date: Date(), tasks: loadTasks())

        // 15分钟后请求刷新（系统不保证）
        let nextRefresh = Calendar.current.date(byAdding: .minute, value: 15, to: Date()) ?? Date().addingTimeInterval(900)
        completion(Timeline(entries: [entry], policy: .after(nextRefresh)))
    }

    private func loadTasks() -> [WidgetTask] {
        guard let defaults = UserDefaults(suiteName: appGroupId),
              let json = defaults.string(forKey: tasksKey),
              let data = json.data(using: .utf8) else {
            return []
        }

        do {
            return try JSONDecoder().decode([WidgetTask].self, from: data)
        } catch {
            // 如果你想 debug，可以临时把 json 打印出来看看格式
            return []
        }
    }
}

// MARK: - View
struct TodayTasksWidgetView: View {
    let entry: TodayTasksEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Today")
                .font(.headline)

            if entry.tasks.isEmpty {
                Text("Open the app to sync tasks")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            } else {
                ForEach(entry.tasks.prefix(3)) { task in
                    HStack(spacing: 8) {
                        Image(systemName: task.isDone ? "checkmark.circle.fill" : "circle")
                        Text(task.title)
                            .lineLimit(1)

                        Spacer()

                        // 这里先不强制显示 endTime（你后面要显示再加解析）
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
        .padding()
    }
}

// MARK: - Widget
struct TodayTasksWidget: Widget {
    let kind: String = "TodayTasksWidget" // TODO: 这个要和 index.swift 暴露的一致

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: TodayTasksProvider()) { entry in
            TodayTasksWidgetView(entry: entry)
        }
        .configurationDisplayName("Today Tasks")
        .description("Shows your tasks for today.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}
