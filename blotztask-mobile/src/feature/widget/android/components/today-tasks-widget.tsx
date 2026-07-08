import React from "react";
import { FlexWidget, TextWidget } from "react-native-android-widget";

import { APP_LINK } from "@/feature/widget/config/widget-config";
import type { TasksWidgetSnapshot } from "@/feature/widget/models/today-tasks-widget-snapshot";
import { TodayTaskRow } from "@/feature/widget/android/components/today-task-row";

type TodayTasksWidgetProps = {
  snapshot: TasksWidgetSnapshot;
  isSmallWidget: boolean;
};

export function TodayTasksWidget({ snapshot, isSmallWidget }: TodayTasksWidgetProps) {
  const visibleTasks = snapshot.tasks.slice(0, 3);
  const hasTasks = visibleTasks.length > 0;

  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri: snapshot.appLink || APP_LINK }}
      accessibilityLabel="Open BlotzTask"
      style={{
        width: "match_parent",
        height: "match_parent",
        flexDirection: "column",
        alignItems: "flex-start",
        justifyContent: "flex-start",
        backgroundColor: "#F5F9FA",
        borderRadius: 24,
        paddingHorizontal: isSmallWidget ? 18 : 22,
        paddingVertical: 20,
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

      {hasTasks ? (
        <FlexWidget
          style={{
            width: "match_parent",
            flexDirection: "column",
            alignItems: "flex-start",
            justifyContent: "flex-start",
            marginTop: isSmallWidget ? 14 : 16,
            flexGap: isSmallWidget ? 13 : 15,
          }}
        >
          {visibleTasks.map((task, index) => (
            <TodayTaskRow key={`task-${index}`} task={task} isSmallWidget={isSmallWidget} />
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
            text={snapshot.message}
            maxLines={isSmallWidget ? 2 : undefined}
            truncate="END"
            style={{
              color: "#202124",
              fontSize: 14,
              fontWeight: "500",
            }}
          />

          {!isSmallWidget ? (
            <TextWidget
              text={snapshot.footerText}
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
