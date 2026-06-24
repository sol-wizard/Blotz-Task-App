"use no memo";

import React from "react";
import { FlexWidget, TextWidget, type WidgetInfo } from "react-native-android-widget";
import {
  TASK_WIDGET_OPEN_APP_DEEP_LINK,
  isTodayTasksWidgetSnapshotStale,
  type TaskWidgetSnapshotItem,
  type TodayTasksWidgetSnapshot,
} from "@/feature/widget/models/today-tasks-widget-snapshot";

type TodayTasksWidgetProps = {
  snapshot: TodayTasksWidgetSnapshot;
  widgetInfo?: WidgetInfo;
};

const COLORS = {
  background: "#F3FAF3",
  green: "#2F8F46",
  text: "#172018",
  muted: "#687569",
  border: "#C5D4C6",
  white: "#FFFFFF",
} as const;

export function TodayTasksWidget({ snapshot }: TodayTasksWidgetProps) {
  const isStale = isTodayTasksWidgetSnapshotStale(snapshot);
  const state = isStale ? "fallback" : snapshot.state;
  const message = isStale ? "Open BlotzTask to refresh today's tasks." : snapshot.message;
  const visibleTasks = snapshot.tasks.slice(0, 3);
  const shouldShowTasks = state === "content" && visibleTasks.length > 0;

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
        backgroundColor: COLORS.background,
        borderRadius: 24,
        paddingHorizontal: 18,
        paddingVertical: 16,
      }}
    >
      <TextWidget
        text={snapshot.title}
        maxLines={1}
        truncate="END"
        style={{
          color: COLORS.green,
          fontSize: 19,
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
            marginTop: 12,
            flexGap: 8,
          }}
        >
          {visibleTasks.map((task, index) => (
            <TaskRow key={`${task.taskId}-${task.title}-${index}`} task={task} />
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
            text={message || "Open BlotzTask to load today's tasks."}
            maxLines={2}
            truncate="END"
            style={{
              color: COLORS.text,
              fontSize: 15,
              fontWeight: "500",
            }}
          />
          <TextWidget
            text="Tap to open the app"
            maxLines={1}
            truncate="END"
            style={{
              color: COLORS.muted,
              fontSize: 12,
              marginTop: 8,
            }}
          />
        </FlexWidget>
      )}
    </FlexWidget>
  );
}

function TaskRow({ task }: { task: TaskWidgetSnapshotItem }) {
  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri: task.deepLink || TASK_WIDGET_OPEN_APP_DEEP_LINK }}
      accessibilityLabel={`Open ${task.title}`}
      style={{
        width: "match_parent",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-start",
      }}
    >
      <FlexWidget
        style={{
          width: 18,
          height: 18,
          borderRadius: 9,
          borderWidth: 2,
          borderColor: COLORS.border,
          backgroundColor: COLORS.white,
          marginRight: 10,
        }}
      />
      <FlexWidget
        style={{
          flex: 1,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "flex-start",
        }}
      >
        <FlexWidget
          style={{
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "flex-start",
          }}
        >
          <TextWidget
            text={task.title}
            maxLines={1}
            truncate="END"
            style={{
              color: COLORS.text,
              fontSize: 15,
              fontWeight: "500",
            }}
          />
        </FlexWidget>
        {task.dueLabel ? (
          <TextWidget
            text={task.dueLabel}
            maxLines={1}
            truncate="END"
            style={{
              color: COLORS.muted,
              fontSize: 11,
              textAlign: "right",
              marginLeft: 8,
            }}
          />
        ) : null}
      </FlexWidget>
    </FlexWidget>
  );
}
