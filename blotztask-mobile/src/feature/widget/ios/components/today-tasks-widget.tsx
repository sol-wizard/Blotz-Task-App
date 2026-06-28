import { HStack, Image, Link, Text, Spacer, VStack } from "@expo/ui/swift-ui";
import {
  containerBackground,
  font,
  foregroundStyle,
  frame,
  lineLimit,
  padding,
  widgetURL,
} from "@expo/ui/swift-ui/modifiers";
import { createWidget, type WidgetEnvironment } from "expo-widgets";

import { TODAY_TASKS_WIDGET_NAME } from "@/feature/widget/config/widget-config";
import type { TasksWidgetSnapshot } from "@/feature/widget/models/today-tasks-widget-snapshot";

const TodayTasksWidgetView = (props: TasksWidgetSnapshot, environment: WidgetEnvironment) => {
  "widget";

  const showTime = environment.widgetFamily !== "systemSmall";
  const visibleTasks = props.tasks.slice(0, 3);

  return (
    <VStack
      alignment="leading"
      spacing={12}
      modifiers={[
        containerBackground("#F5F9FA", "widget"),
        frame({ maxWidth: 360, alignment: "topLeading" }),
        padding({ top: 15, bottom: 15, leading: 16, trailing: 12 }),
        widgetURL(props.openAppDeepLink),
      ]}
    >
      <Text
        modifiers={[
          font({ size: 16, family: "Baloo2-Bold" }),
          foregroundStyle("#2F8F46"),
          lineLimit(1),
        ]}
      >
        {props.title}
      </Text>

      {props.state === "content" ? (
        <VStack
          alignment="leading"
          spacing={10}
          modifiers={[frame({ maxWidth: 360, alignment: "leading" })]}
        >
          {visibleTasks.map((task, index) => (
            <Link key={`task-${index}`} destination={task.deepLink || props.openAppDeepLink}>
              <HStack
                spacing={10}
                alignment="center"
                modifiers={[
                  frame({
                    minWidth: 130,
                    maxWidth: 360,
                    alignment: "leading",
                  }),
                ]}
              >
                <Image systemName="circle" size={20} color="#C8CDD2" />

                <Text
                  modifiers={[
                    font({ family: "Baloo2-Regular", size: 14 }),
                    foregroundStyle("#202124"),
                  ]}
                >
                  {task.title}
                </Text>

                {showTime && task.timeLabel ? (
                  <>
                    <Spacer minLength={0} />

                    <Text
                      modifiers={[
                        font({ family: "Baloo2-Medium", size: 11 }),
                        foregroundStyle("#64748B"),
                        lineLimit(1),
                      ]}
                    >
                      {task.timeLabel}
                    </Text>
                  </>
                ) : null}
              </HStack>
            </Link>
          ))}
        </VStack>
      ) : (
        <VStack
          alignment="leading"
          spacing={6}
          modifiers={[frame({ minHeight: 84 }), padding({ top: 3 })]}
        >
          <Text
            modifiers={[
              font({ size: 14, family: "Baloo2-SemiBold" }),
              foregroundStyle("#202124"),
              lineLimit(2),
            ]}
          >
            {props.message || "Open BlotzTask to refresh."}
          </Text>

          {showTime && (
            <Text modifiers={[font({ size: 11, weight: "medium" }), foregroundStyle("#64748B")]}>
              Tap to open the app
            </Text>
          )}
        </VStack>
      )}
    </VStack>
  );
};

export default createWidget<TasksWidgetSnapshot>(TODAY_TASKS_WIDGET_NAME, TodayTasksWidgetView);
