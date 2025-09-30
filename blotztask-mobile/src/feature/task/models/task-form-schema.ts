import z from "zod";

const TimeTypeEnum = z.enum(["single", "range"]);
// TODO: Add repeat and label check

export const taskFormSchema = z
  .object({
    title: z.string().min(1, "Title is required").max(80, "Max 80 chars"),
    description: z.union([z.string().max(1000, "Max 1000 chars"), z.literal("")]).optional(),
    timeType: TimeTypeEnum.optional(),
    startDate: z.date().optional(),
    startTime: z.date().optional(),
    endDate: z.date().optional(),
    endTime: z.date().optional(),
    labelId: z.number(),
  })
  .refine(
    (data) => {
      if (!data.timeType) return true;

      if (data.timeType === "single") {
        // single tasks require startDate, startTime optional
        return !!data.startDate;
      }

      if (data.timeType === "range") {
        // range tasks require startDate and endDate
        if (!data.startDate || !data.endDate) return false;

        // If times are not provided, valid
        if (!data.startTime || !data.endTime) return true;

        // Compare start and end times only if both times provided
        const start = new Date(
          new Date(data.startDate).setHours(
            data.startTime.getHours(),
            data.startTime.getMinutes(),
            0,
            0,
          ),
        );
        const end = new Date(
          new Date(data.endDate).setHours(data.endTime.getHours(), data.endTime.getMinutes(), 0, 0),
        );

        return end.getTime() >= start.getTime();
      }

      return true;
    },
    {
      message: "End time cannot be earlier than start time",
      path: ["endTime"],
    },
  );

export type TaskFormField = z.infer<typeof taskFormSchema>;

export default TaskFormField;
