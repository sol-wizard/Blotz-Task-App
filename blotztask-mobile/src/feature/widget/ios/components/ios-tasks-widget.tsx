import { HStack, Image, Link, Text, Spacer, VStack, ZStack } from "@expo/ui/swift-ui";
import {
  background,
  containerBackground,
  cornerRadius,
  font,
  foregroundStyle,
  frame,
  lineLimit,
  padding,
  resizable,
  widgetURL,
} from "@expo/ui/swift-ui/modifiers";
import { createWidget, type WidgetEnvironment } from "expo-widgets";

import { IOS_TASK_WIDGET_NAME } from "@/feature/widget/config/widget-config";
import type { TasksWidgetSnapshot } from "@/feature/widget/models/tasks-widget-snapshot";

const TodayTasksWidgetView = (props: TasksWidgetSnapshot, environment: WidgetEnvironment) => {
  "widget";

  const isSmallWidget = environment.widgetFamily === "systemSmall";
  const visibleTasks = props.tasks.slice(0, 3);
  const starImage = isSmallWidget ? undefined : props.starImage;

  return (
    <ZStack
      alignment="bottomTrailing"
      modifiers={[
        containerBackground("#F5F9FA", "widget"),
        frame({ maxWidth: 360, maxHeight: 360 }),
        widgetURL(props.appLink),
      ]}
    >
      {starImage ? (
        <Image
          uiImage={starImage.uri}
          modifiers={[resizable(), frame({ width: starImage.width, height: starImage.height })]}
        />
      ) : null}

      <VStack
        alignment="leading"
        spacing={12}
        modifiers={[
          frame({ maxWidth: 360, maxHeight: 360, alignment: "topLeading" }),
          padding({ top: 15, bottom: 15, leading: 16, trailing: 12 }),
        ]}
      >
        <HStack alignment="center" spacing={8} modifiers={[frame({ maxWidth: 360 })]}>
          <Text
            modifiers={[
              font({ size: 16, family: "Baloo2-Bold" }),
              foregroundStyle("#2F8F46"),
              lineLimit(1),
            ]}
          >
            {isSmallWidget ? props.title : props.dateTitle || props.title}
          </Text>

          <Spacer minLength={0} />

          <Text
            modifiers={[
              font({ size: 16, family: "Baloo2-Bold" }),
              foregroundStyle("#7CB518"),
              lineLimit(1),
              padding({ leading: 8, trailing: 8, top: 2, bottom: 2 }),
              frame({ minWidth: 28 }),
              background("#EEF7DC"),
              cornerRadius(8),
            ]}
          >
            {String(props.tasks.length)}
          </Text>
        </HStack>

        {visibleTasks.length > 0 ? (
          <VStack
            alignment="leading"
            spacing={10}
            modifiers={[frame({ maxWidth: 360, alignment: "leading" })]}
          >
            {visibleTasks.map((task, index) => (
              <Link key={`task-${index}`} destination={task.link || props.appLink}>
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

                  {!isSmallWidget ? (
                    <>
                      <Spacer minLength={0} />

                      <Text
                        modifiers={[
                          font({ family: "Baloo2-Medium", size: 11 }),
                          foregroundStyle("#64748B"),
                          lineLimit(1),
                        ]}
                      >
                        {task.time}
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
              {props.message}
            </Text>
          </VStack>
        )}
      </VStack>
    </ZStack>
  );
};

export default createWidget<TasksWidgetSnapshot>(IOS_TASK_WIDGET_NAME, TodayTasksWidgetView);
