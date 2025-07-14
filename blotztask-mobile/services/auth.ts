export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  tokenType?: string;
  accessToken?: string;
  expiresIn?: number;
  refreshToken?: string;
}

const API_BASE_URL = 'https://wapp-blotztaskapp.azurewebsites.net';

export const login = async (credentials: LoginCredentials): Promise<LoginResponse> => {
  const response = await fetch(`${API_BASE_URL}/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(credentials),
  });

  if (!response.ok) {
    throw new Error('Login failed');
  }

  return response.json();
}; 