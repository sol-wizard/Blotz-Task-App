import React from "react";
import { FlexWidget, TextWidget } from "react-native-android-widget";

import { APP_LINK } from "@/feature/widget/config/widget-config";
import type { TaskWidgetSnapshotItem } from "@/feature/widget/models/tasks-widget-snapshot";

type TodayTaskRowProps = {
  task: TaskWidgetSnapshotItem;
  isSmallWidget: boolean;
};

export function TodayTaskRow({ task, isSmallWidget }: TodayTaskRowProps) {
  const rowHeight = isSmallWidget ? 27 : 29;
  const circleSize = isSmallWidget ? 23 : 25;

  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri: task.link || APP_LINK }}
      accessibilityLabel={`Open ${task.title}`}
      style={{
        width: "match_parent",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-start",
        height: rowHeight,
      }}
    >
      <FlexWidget
        style={{
          width: circleSize,
          height: circleSize,
          borderRadius: circleSize / 2,
          borderWidth: 2,
          borderColor: "#C8CDD2",
          backgroundColor: "#F5F9FA",
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
              color: "#202124",
              fontSize: isSmallWidget ? 17 : 18,
              fontWeight: "500",
            }}
          />
        </FlexWidget>

        {!isSmallWidget ? (
          <TextWidget
            text={task.time}
            maxLines={1}
            truncate="END"
            style={{
              color: "#64748B",
              fontSize: 13,
              fontWeight: "500",
              textAlign: "right",
              marginLeft: 8,
            }}
          />
        ) : null}
      </FlexWidget>
    </FlexWidget>
  );
}
