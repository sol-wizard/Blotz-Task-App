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

export const loginService = async (credentials: LoginCredentials): Promise<LoginResponse> => {
  const response = await fetch(`${process.env.EXPO_PUBLIC_URL}/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(credentials),
  });

  if (!response.ok) {
    throw new Error("Login failed");
  }

  return response.json();
};
