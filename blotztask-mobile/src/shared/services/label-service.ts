import { LabelDTO } from "../models/label-dto";
import { fetchWithAuth } from "./fetch-with-auth";

export const fetchAllLabel = async (): Promise<LabelDTO[]> => {
  const result = await fetchWithAuth<LabelDTO[]>(`${process.env.EXPO_PUBLIC_URL_WITH_API}/Label`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  return result;
};
