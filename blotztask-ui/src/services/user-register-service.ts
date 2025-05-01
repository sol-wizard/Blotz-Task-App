import { BadRequestError } from '@/model/error/bad-request-error';

export type RegisterFormData = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
};

export async function registerUser(data: RegisterFormData) {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL_WITH_API}/userinfo/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json();

    const errorMessages = Array.isArray(errorData)
      ? errorData.map((error) => error.description).join('\n')
      : errorData.message || 'Registration failed.';

    throw new BadRequestError(errorMessages);
  }

  return response.json();
}