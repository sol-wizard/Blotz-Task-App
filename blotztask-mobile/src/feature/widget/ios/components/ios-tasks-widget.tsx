import { HStack, Image, Link, Text, Spacer, VStack, ZStack } from "@expo/ui/swift-ui";
import {
  background,
  containerBackground,
  cornerRadius,
  font,
  foregroundStyle,
  fixedSize,
  frame,
  layoutPriority,
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
  // A Baloo2 font name with Chinese text makes iOS measure it too narrow and truncate it
  // ("Lecture2复习" → "Lecture2..."), so text with any non-ASCII character uses the system
  // font. "light" matches how the Baloo2 lines already look on the widget.
  // Defined inside the widget function: code outside it isn't available to the widget.
  const textFont = (text: string, size: number, family: string) =>
    /[\u0080-\uffff]/.test(text) ? font({ size, weight: "light" }) : font({ family, size });

  return (
    <ZStack
      alignment="bottomTrailing"
      modifiers={[
        containerBackground("#F5F9FA", "widget"),
        frame({ maxWidth: 1000, maxHeight: 1000 }),
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
          padding({ top: 16, bottom: 14, leading: 16, trailing: 14 }),
        ]}
      >
        <HStack alignment="center" spacing={8} modifiers={[frame({ maxWidth: 360 })]}>
          <Text
            modifiers={[
              // System font: Baloo2 has no Chinese glyphs, so iOS measured "10月18日" too narrow and truncated it.
              font({ size: 16, weight: "bold" }),
              foregroundStyle("#2F8F46"),
              lineLimit(1),
              layoutPriority(1),
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
              fixedSize(),
            ]}
          >
            {String(props.tasks.length)}
          </Text>
        </HStack>

        {visibleTasks.length > 0 ? (
          <VStack
            alignment="leading"
            spacing={isSmallWidget ? 10 : 6}
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

                  <VStack alignment="leading" spacing={0}>
                    <Text
                      modifiers={[
                        textFont(task.title, 14, "Baloo2-Regular"),
                        foregroundStyle("#202124"),
                        lineLimit(1),
                      ]}
                    >
                      {task.title}
                    </Text>

                    {!isSmallWidget ? (
                      <Text
                        modifiers={[
                          font({ family: "Baloo2-Medium", size: 11 }),
                          foregroundStyle("#64748B"),
                          lineLimit(1),
                        ]}
                      >
                        {task.time}
                      </Text>
                    ) : null}
                  </VStack>
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
                textFont(props.message, 14, "Baloo2-SemiBold"),
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
