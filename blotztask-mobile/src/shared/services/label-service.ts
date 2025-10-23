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

export const createLabel = async (payload: {
  name: string;
  color: string;
  description?: string | null;
}): Promise<LabelDTO> => {
  const body = {
    name: payload.name,
    color: payload.color,
    description: payload.description ?? null,
  };

  const result = await fetchWithAuth<LabelDTO>(`${process.env.EXPO_PUBLIC_URL_WITH_API}/label`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  return result;
};
