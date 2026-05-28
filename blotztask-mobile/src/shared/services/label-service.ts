import { LabelDTO } from "../models/label-dto";
import { apiClient } from "./api/client";

export const fetchAllLabel = async (): Promise<LabelDTO[]> => {
  const url = `/Label`;
  return await apiClient.get(url);
};
