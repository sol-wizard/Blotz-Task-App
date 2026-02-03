import WidgetKit
import SwiftUI
import Foundation

struct Provider: AppIntentTimelineProvider {
    func placeholder(in context: Context) -> SimpleEntry {
        SimpleEntry(date: Date(), configuration: ConfigurationAppIntent())
    }

    func snapshot(for configuration: ConfigurationAppIntent, in context: Context) async -> SimpleEntry {
        SimpleEntry(date: Date(), configuration: configuration)
    }
    
    func timeline(for configuration: ConfigurationAppIntent, in context: Context) async -> Timeline<SimpleEntry> {
        var entries: [SimpleEntry] = []

        // Generate a timeline consisting of five entries an hour apart, starting from the current date.
        let currentDate = Date()
        for hourOffset in 0 ..< 5 {
            let entryDate = Calendar.current.date(byAdding: .hour, value: hourOffset, to: currentDate)!
            let entry = SimpleEntry(date: entryDate, configuration: configuration)
            entries.append(entry)
        }

        return Timeline(entries: entries, policy: .atEnd)
    }
}

struct SimpleEntry: TimelineEntry {
    let date: Date
    let configuration: ConfigurationAppIntent
}

struct Task: Codable {
  let id: String
  let title: String
  let isDone: String
  let endTime: String
}

//var mockData: [Task] = [
//  Task(id: "1", title: "Wash the car", isDone: "false", endTime: "2026-02-03T10:30:00Z"),
//  Task(id: "2", title: "Walk the dog", isDone: "false", endTime: "2026-02-03T14:00:00Z"),
//  Task(id: "3", title: "Go for a run", isDone: "true", endTime: "2026-02-02T16:45:00Z"),
//  Task(id: "4", title: "Go for a run", isDone: "false", endTime: "2026-02-02T16:45:00Z")
//]

struct WidgetEntryView: View {
    var entry: Provider.Entry
    
    var body: some View {
        let defaults = UserDefaults(suiteName: "group.com.Blotz.BlotzTask.widget")
        let todos = (
            (defaults?.data(forKey: "widget_today_tasks"))
                .flatMap { try? JSONDecoder().decode([Task].self, from: $0) }
        ) ?? []
      
     
        
        // Filter incomplete tasks
        let incompleteTasks = todos.filter { $0.isDone != "true" }
        let completedTasks = todos.filter { $0.isDone == "true" }
        
        // Get the count of completed tasks
        let completedCount = completedTasks.count
        let totalCount = todos.count
        
        // Show up to 3 tasks only
        let displayedTasks = Array(incompleteTasks.prefix(3))
        
        VStack(alignment: .leading) {
            // Display the "Today" label with completed vs total count
          VStack(alignment: .leading) {
              HStack(alignment: .bottom) {
                  // "Today" label with the normal style
                  Text(NSLocalizedString("Today", comment: "Today label"))
                      .font(.headline)
                      .foregroundColor(Color(red: 68/255, green: 73/255, blue: 100/255))
                  
                  // Completed count with a smaller font size and lighter gray color
                Text(NSLocalizedString( "\(completedCount) of \(totalCount) completed", comment: "Completion"))
                  .font(.caption) // Smaller font size
                      .foregroundColor(Color.gray) // Lighter gray color
              }
              
              // The rest of your UI content...
          }
            
            // If there are no tasks, show a message
            if incompleteTasks.isEmpty {
                Text(NSLocalizedString("No tasks for today...🧐", comment: "Empty label"))
                    .font(.subheadline)
                    .foregroundColor(Color(red: 68/255, green: 73/255, blue: 100/255))
                    .padding(10)
            }
            
            // Task List: Only show incomplete tasks, limited to 3 tasks
            
                ForEach(displayedTasks, id: \.id) { todo in
                    HStack {
                        Image(systemName: todo.isDone == "true" ? "checkmark.circle.fill" : "circle")
                            .foregroundColor(Color(red: 154/255, green: 213/255, blue: 19/255))
                        Text(todo.title)
                            .font(.footnote)
                            .foregroundColor(Color(red: 68/255, green: 73/255, blue: 100/255))
                      Spacer()
                      if isEndTimeToday(endTime: todo.endTime) {
                        Text(formatEndTime(todo.endTime))
                                .font(.footnote)
                                .foregroundColor(Color.gray)
                                
                        }
                    }
                    .padding(.vertical, 2)
                }
            
        }
        .padding()
        .frame(maxWidth: .infinity,maxHeight: .infinity, alignment: .topLeading)
        
    }
  

  

  // Helper function to check if endTime is today (in UTC format)
  func isEndTimeToday(endTime: String) -> Bool {
      // Get the current date and time in UTC
      let currentDate = Date()
      let dateFormatter = DateFormatter()
      
      // Set the date format to UTC format (ISO 8601)
      dateFormatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ss'Z'"
      dateFormatter.timeZone = TimeZone(abbreviation: "UTC")  // Set time zone to UTC
      
      // Convert endTime (UTC string) to a Date object
      guard let taskEndTime = dateFormatter.date(from: endTime) else {
          return false
      }
      
      // Compare if the task's endTime is today
      let calendar = Calendar.current
      return calendar.isDateInToday(taskEndTime)
  }

  // Helper function to format end time (UTC string to "HH:mm")
  func formatEndTime(_ endTime: String) -> String {
      // Convert the UTC time string to a Date object
      let dateFormatter = DateFormatter()
      dateFormatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ss'Z'"
      dateFormatter.timeZone = TimeZone(abbreviation: "UTC")
      
      guard let taskEndTime = dateFormatter.date(from: endTime) else {
          return ""
      }
      
      // Format the Date object to "HH:mm" format
      dateFormatter.dateFormat = "HH:mm"
      return dateFormatter.string(from: taskEndTime)
  }
}

struct TaskWidget: Widget {
    let kind: String = "taskWidget"

    var body: some WidgetConfiguration {
        AppIntentConfiguration(kind: kind, intent: ConfigurationAppIntent.self, provider: Provider()) { entry in
            WidgetEntryView(entry: entry)
            .containerBackground(Color("widgetBackground"), for: .widget)
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

#Preview(as: .systemSmall) {
    TaskWidget()
} timeline: {
    SimpleEntry(date: .now, configuration: .smiley)
    SimpleEntry(date: .now, configuration: .starEyes)
}

#Preview(as: .systemMedium) {
    TaskWidget()
} timeline: {
    SimpleEntry(date: .now, configuration: .smiley)
    SimpleEntry(date: .now, configuration: .starEyes)
}
