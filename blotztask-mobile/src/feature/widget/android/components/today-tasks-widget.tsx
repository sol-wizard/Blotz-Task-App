import React from "react";
import { FlexWidget, TextWidget, type WidgetInfo } from "react-native-android-widget";

import { TASK_WIDGET_OPEN_APP_DEEP_LINK } from "@/feature/widget/config/widget-config";
import type { TasksWidgetSnapshot } from "@/feature/widget/models/today-tasks-widget-snapshot";
import { TodayTaskRow } from "@/feature/widget/android/components/today-task-row";

type TodayTasksWidgetProps = {
  snapshot: TasksWidgetSnapshot;
  widgetInfo?: WidgetInfo;
};

export function TodayTasksWidget({ snapshot, widgetInfo }: TodayTasksWidgetProps) {
  const isCompact = isCompactWidget(widgetInfo);
  const showTime = !isCompact;
  const visibleTasks = snapshot.tasks.slice(0, 3);
  const shouldShowTasks = snapshot.state === "content" && visibleTasks.length > 0;

  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri: snapshot.openAppDeepLink || TASK_WIDGET_OPEN_APP_DEEP_LINK }}
      accessibilityLabel="Open BlotzTask"
      style={{
        width: "match_parent",
        height: "match_parent",
        flexDirection: "column",
        alignItems: "flex-start",
        justifyContent: "flex-start",
        backgroundColor: "#F5F9FA",
        borderRadius: 24,
        paddingHorizontal: isCompact ? 18 : 22,
        paddingVertical: isCompact ? 20 : 20,
      }}
    >
      <TextWidget
        text={snapshot.title}
        maxLines={1}
        truncate="END"
        style={{
          color: "#2F8F46",
          fontSize: 18,
          fontWeight: "700",
        }}
      />

      {shouldShowTasks ? (
        <FlexWidget
          style={{
            width: "match_parent",
            flexDirection: "column",
            alignItems: "flex-start",
            justifyContent: "flex-start",
            marginTop: isCompact ? 14 : 16,
            flexGap: isCompact ? 13 : 15,
          }}
        >
          {visibleTasks.map((task, index) => (
            <TodayTaskRow
              key={`task-${index}`}
              task={task}
              showTime={showTime}
              compact={isCompact}
            />
          ))}
        </FlexWidget>
      ) : (
        <FlexWidget
          style={{
            width: "match_parent",
            flexDirection: "column",
            alignItems: "flex-start",
            justifyContent: "center",
            marginTop: 12,
          }}
        >
          <TextWidget
            text={snapshot.message || "Open BlotzTask to load today's tasks."}
            maxLines={isCompact ? 2 : undefined}
            truncate="END"
            style={{
              color: "#202124",
              fontSize: 14,
              fontWeight: "500",
            }}
          />

          {showTime && !isCompact ? (
            <TextWidget
              text="Tap to open the app"
              maxLines={1}
              truncate="END"
              style={{
                color: "#64748B",
                fontSize: 11,
                marginTop: 8,
              }}
            />
          ) : null}
        </FlexWidget>
      )}
    </FlexWidget>
  );
}

function isCompactWidget(widgetInfo?: WidgetInfo): boolean {
  if (!widgetInfo) return false;

  return widgetInfo.width < 220;
}
