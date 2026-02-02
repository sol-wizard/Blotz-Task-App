import Foundation
import AppIntents
import WidgetKit

struct ToggleTaskDoneIntent: AppIntent {
    static var title: LocalizedStringResource { "Toggle Task Done" }
    static var description: IntentDescription { IntentDescription("Toggle the completion state of a task.") }

    @Parameter(title: "Task ID")
    var taskID: String

    init() {}
    init(taskID: String) {
        self.taskID = taskID  // 直接初始化 taskID，不需要 wrappedValue
    }

    private struct WidgetTaskLike: Codable {
        let id: String
        var title: String
        var isDone: Bool
        var endTime: String?
    }

    func perform() async throws -> some IntentResult {
        let userDefaults = UserDefaults(suiteName: "group.com.yourcompany.blotztask")
        guard let userDefaults = userDefaults else {
            return .result()
        }

        guard let jsonString = userDefaults.string(forKey: "today_tasks") else {
            // No tasks stored, return success
            return .result()
        }

        guard let jsonData = jsonString.data(using: .utf8) else {
            // Invalid data, return success
            return .result()
        }

        // Decode tasks
        var tasks: [WidgetTaskLike]
        do {
            tasks = try JSONDecoder().decode([WidgetTaskLike].self, from: jsonData)
        } catch {
            // Decoding failed, return success
            return .result()
        }

        // Find task and toggle isDone
        guard let index = tasks.firstIndex(where: { $0.id == taskID }) else {
            // Task not found, return success
            return .result()
        }

        tasks[index].isDone.toggle()

        // Encode tasks back to JSON string
        do {
            let updatedData = try JSONEncoder().encode(tasks)
            if let updatedString = String(data: updatedData, encoding: .utf8) {
                userDefaults.set(updatedString, forKey: "today_tasks")
                userDefaults.synchronize()
                WidgetCenter.shared.reloadTimelines(ofKind: "widget")
            }
        } catch {
            // Encoding failed, do nothing
        }

        return .result()
    }
}
