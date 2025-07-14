import { LabelDTO } from '@/model/label-dto';
import { fetchWithAuth } from '@/utils/fetch-with-auth';

export const fetchAllLabel = async (): Promise<LabelDTO[]> => {
  const result = await fetchWithAuth<LabelDTO[]>(
    `${process.env.NEXT_PUBLIC_API_BASE_URL_WITH_API}/label`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  return result;
};
