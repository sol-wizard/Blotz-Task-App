import { AiUsageSummaryDTO } from "../models/ai-usage-summary-dto";
import { apiClient } from "./api/client";

export const getAiUsageSummary = async (): Promise<AiUsageSummaryDTO> => {
  const url = `/ai-usage`;
  return await apiClient.get<AiUsageSummaryDTO>(url);
};
