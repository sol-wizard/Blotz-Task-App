import { LabelDTO } from "../models/label-dto";
import { apiClient } from "./api/client";

export const fetchAllLabel = async (): Promise<LabelDTO[]> => {
  const url = "/Label";
  try {
    const result: LabelDTO[] = await apiClient.get(url);
    return result;
  } catch {
    throw new Error("Failed to fetch labels.");
  }
};
