import z from "zod";

const TimeTypeEnum = z.enum(["single", "range"]);

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
  .superRefine((data, ctx) => {
    if (!data.timeType) return;

    if (data.timeType === "single") {
      if (!data.startDate) {
        ctx.addIssue({
          code: "custom",
          message: "Start date is required for single time tasks",
          path: ["startDate"],
        });
      }
    }

    if (data.timeType === "range") {
      if (!data.startDate) {
        ctx.addIssue({
          code: "custom",
          message: "Start date is required",
          path: ["startDate"],
        });
      }

      if (!data.endDate) {
        ctx.addIssue({
          code: "custom",
          message: "End date is required",
          path: ["endDate"],
        });
      }

      // Validate time ordering if both dates and times are present
      if (data.startDate && data.endDate && data.startTime && data.endTime) {
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

        if (end.getTime() < start.getTime()) {
          ctx.addIssue({
            code: "custom",
            message: "End time cannot be earlier than start time",
            path: ["endTime"],
          });
        }
      }
    }
  });

export type TaskFormField = z.infer<typeof taskFormSchema>;

export default TaskFormField;
