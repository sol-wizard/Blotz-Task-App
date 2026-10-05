import React from "react";
import { FlexWidget, ImageWidget, OverlapWidget, TextWidget } from "react-native-android-widget";

import { APP_LINK, WIDGET_STAR_IMAGES } from "@/feature/widget/config/widget-config";
import type { TasksWidgetSnapshot } from "@/feature/widget/models/tasks-widget-snapshot";
import { TodayTaskRow } from "@/feature/widget/android/components/today-task-row";
import { getWidgetStarVariant } from "@/feature/widget/util/widget-stars-util";

type TodayTasksWidgetProps = {
  snapshot: TasksWidgetSnapshot;
  isSmallWidget: boolean;
};

export function TodayTasksWidget({ snapshot, isSmallWidget }: TodayTasksWidgetProps) {
  const visibleTasks = snapshot.tasks.slice(0, 3);
  const hasTasks = visibleTasks.length > 0;
  const starVariant = isSmallWidget ? null : getWidgetStarVariant(snapshot.tasks.length);
  const starImage = starVariant ? WIDGET_STAR_IMAGES[starVariant] : null;

  return (
    <OverlapWidget
      style={{
        width: "match_parent",
        height: "match_parent",
        backgroundColor: "#F5F9FA",
        borderRadius: 24,
        overflow: "hidden",
      }}
    >
      {starImage ? (
        <FlexWidget
          style={{
            width: "match_parent",
            height: "match_parent",
            alignItems: "flex-end",
            justifyContent: "flex-end",
          }}
        >
          <ImageWidget
            image={starImage.source}
            imageWidth={starImage.width}
            imageHeight={starImage.height}
          />
        </FlexWidget>
      ) : null}

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
          paddingHorizontal: isSmallWidget ? 18 : 22,
          paddingVertical: 20,
        }}
      >
        <FlexWidget
          style={{
            width: "match_parent",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <FlexWidget style={{ flex: 1 }}>
            <TextWidget
              text={isSmallWidget ? snapshot.title : snapshot.dateTitle || snapshot.title}
              maxLines={1}
              truncate="END"
              style={{
                color: "#2F8F46",
                fontSize: 18,
                fontWeight: "700",
              }}
            />
          </FlexWidget>

          <FlexWidget
            style={{
              height: 28,
              paddingHorizontal: 9,
              marginLeft: 8,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#EEF7DC",
              borderRadius: 8,
            }}
          >
            <TextWidget
              text={String(snapshot.tasks.length)}
              maxLines={1}
              style={{
                color: "#7CB518",
                fontSize: 18,
                fontWeight: "700",
              }}
            />
          </FlexWidget>
        </FlexWidget>

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
          </FlexWidget>
        )}
      </FlexWidget>
    </OverlapWidget>
  );
}
