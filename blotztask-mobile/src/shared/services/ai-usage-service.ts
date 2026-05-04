import { AiUsageSummaryDTO } from "../models/ai-usage-summary-dto";
import { apiClient } from "./api/client";

export const getAiUsageSummary = async (): Promise<AiUsageSummaryDTO> => {
  const url = "/ai-usage";
  try {
    const response = await apiClient.get<AiUsageSummaryDTO>(url);
    return response;
  } catch {
    throw new Error("Failed to get ai usage summary.");
  }
};
