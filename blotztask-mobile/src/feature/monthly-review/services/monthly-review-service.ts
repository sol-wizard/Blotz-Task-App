import { apiClient } from "@/shared/services/api/client";
import {
  ReviewPeriodType,
  ReviewReportDTO,
} from "@/feature/monthly-review/models/monthly-review-dto";

// The device's IANA timezone (e.g. "Australia/Sydney"). The backend snaps the anchor
// date to the local period boundary using this.
const deviceTimeZoneId = (): string => Intl.DateTimeFormat().resolvedOptions().timeZone;

// anchorDate: any date inside the target period ("YYYY-MM-DD"); the backend canonicalizes it.
export const fetchReview = async (
  periodType: ReviewPeriodType,
  anchorDate: string,
): Promise<ReviewReportDTO> => {
  const params = new URLSearchParams({
    periodType,
    anchorDate,
    timeZoneId: deviceTimeZoneId(),
  });
  return await apiClient.get<ReviewReportDTO>(`/Review?${params.toString()}`);
};

export const generateReview = async (
  periodType: ReviewPeriodType,
  anchorDate: string,
): Promise<ReviewReportDTO> => {
  return await apiClient.post<ReviewReportDTO>("/Review/generate", {
    periodType,
    anchorDate,
    timeZoneId: deviceTimeZoneId(),
  });
};
