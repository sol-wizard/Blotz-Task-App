export enum TaskTimeType {
  Single = 0,
  Range = 1,
}

// Convert form value ("single" | "range") → DTO value (TaskTimeType)
export const mapFormToDtoTimeType = (formType?: "single" | "range"): TaskTimeType | undefined => {
  if (formType === "single") return TaskTimeType.Single;
  if (formType === "range") return TaskTimeType.Range;
  return undefined;
};
// Convert DTO value (TaskTimeType) → form value ("single" | "range")
export const mapDtoToFormTimeType = (dtoType?: TaskTimeType): "single" | "range" | undefined => {
  if (dtoType === TaskTimeType.Single) return "single";
  if (dtoType === TaskTimeType.Range) return "range";
  return undefined;
};
