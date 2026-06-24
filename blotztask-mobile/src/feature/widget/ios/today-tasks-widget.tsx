import { HStack, Image, Link, Text, VStack } from "@expo/ui/swift-ui";
import {
  containerBackground,
  font,
  foregroundStyle,
  frame,
  layoutPriority,
  lineLimit,
  padding,
  truncationMode,
  widgetURL,
} from "@expo/ui/swift-ui/modifiers";
import { createWidget, type WidgetEnvironment } from "expo-widgets";
import {
  TODAY_TASKS_WIDGET_NAME,
  type TodayTasksWidgetSnapshot,
} from "@/feature/widget/models/today-tasks-widget-snapshot";

const TodayTasksWidgetView = (props: TodayTasksWidgetSnapshot, environment: WidgetEnvironment) => {
  "widget";

  const isSmall = environment.widgetFamily === "systemSmall";
  const maxVisibleTasks = environment.widgetFamily === "systemLarge" ? 5 : isSmall ? 3 : 4;
  const visibleTasks = props.tasks.slice(0, maxVisibleTasks);

  return (
    <VStack
      alignment="leading"
      spacing={isSmall ? 12 : 13}
      modifiers={[
        containerBackground("#F5F9FA", "widget"),
        frame({ maxWidth: 360, alignment: "leading" }),
        padding({ top: 15, bottom: 15, leading: 16, trailing: 12 }),
        widgetURL(props.openAppDeepLink),
      ]}
    >
      <Text
        modifiers={[
          font({ size: isSmall ? 16 : 18, weight: "bold", design: "rounded" }),
          foregroundStyle("#2F8F46"),
          lineLimit(1),
        ]}
      >
        {props.title}
      </Text>

      {props.state === "content" ? (
        <VStack
          alignment="leading"
          spacing={isSmall ? 10 : 11}
          modifiers={[frame({ maxWidth: 360, alignment: "leading" })]}
        >
          {visibleTasks.map((task) => (
            <Link
              key={`${task.taskId ?? task.title}-${task.dueLabel ?? "none"}`}
              destination={task.deepLink || props.openAppDeepLink}
            >
              <HStack
                spacing={10}
                alignment="center"
                modifiers={[frame({ minWidth: 130, maxWidth: 360, alignment: "leading" })]}
              >
                <Image systemName="circle" size={22} color="#C8CDD2" />
                <VStack alignment="leading" spacing={1} modifiers={[layoutPriority(1)]}>
                  <Text
                    modifiers={[
                      font({ size: isSmall ? 14 : 15, weight: "regular" }),
                      foregroundStyle("#202124"),
                      lineLimit(1),
                      truncationMode("tail"),
                    ]}
                  >
                    {task.title}
                  </Text>
                </VStack>
              </HStack>
            </Link>
          ))}
        </VStack>
      ) : (
        <VStack
          alignment="leading"
          spacing={6}
          modifiers={[frame({ maxWidth: 360, minHeight: isSmall ? 52 : 70 }), padding({ top: 3 })]}
        >
          <Text
            modifiers={[
              font({ size: isSmall ? 13 : 14, weight: "semibold" }),
              foregroundStyle("#202124"),
              lineLimit(2),
            ]}
          >
            {props.message || "Open BlotzTask to refresh."}
          </Text>
          {!isSmall && (
            <Text
              modifiers={[
                font({ size: 11, weight: "medium" }),
                foregroundStyle("#64748B"),
                lineLimit(1),
              ]}
            >
              Tap to open the app
            </Text>
          )}
        </VStack>
      )}
    </VStack>
  );
};

export default createWidget<TodayTasksWidgetSnapshot>(
  TODAY_TASKS_WIDGET_NAME,
  TodayTasksWidgetView,
);
