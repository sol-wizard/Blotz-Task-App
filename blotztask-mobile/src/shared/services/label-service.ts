import { LabelDTO } from "../models/label-dto";
import { apiClient } from "./api-client";

export const fetchAllLabel = async (): Promise<LabelDTO[]> => {
  const url = `${process.env.EXPO_PUBLIC_URL_WITH_API}/Label`;
  const result: LabelDTO[] = await apiClient.get(url);
  return result;
};
