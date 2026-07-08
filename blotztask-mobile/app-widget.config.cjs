const iosWidgetConfig = {
  widgets: [
    {
      name: "TodayTasksWidget",
      displayName: "Today's Tasks",
      description: "Shows a lightweight summary of today's BlotzTask tasks.",
      supportedFamilies: ["systemSmall", "systemMedium"],
    },
  ],
};

const androidWidgetConfig = {
  widgets: [
    {
      name: "TodayTasksMedianWidget",
      label: "BlotzTask",
      minWidth: "250dp",
      minHeight: "110dp",
      targetCellWidth: 4,
      targetCellHeight: 2,
      resizeMode: "horizontal|vertical",
      updatePeriodMillis: 1800000,
    },
    {
      name: "TodayTasksSmallWidget",
      label: "BlotzTask",
      minWidth: "110dp",
      minHeight: "110dp",
      targetCellWidth: 2,
      targetCellHeight: 2,
      resizeMode: "horizontal|vertical",
      updatePeriodMillis: 1800000,
    },
  ],
};

module.exports = {
  androidWidgetConfig,
  iosWidgetConfig,
};
