'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { AlertDestructive } from '@/components/ui/alert-destructive';
import { fetchWithErrorHandling } from '@/utils/http-client';
import { BadRequestError } from '@/model/error/bad-request-error';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

const SignUpPage = () => {
  const router = useRouter(); // Initialize router
  const [email, setEmail] = useState(''); // State for email input
  const [password, setPassword] = useState(''); // State for password input
  const [error, setError] = useState(null); // State for error message
  const [loading, setLoading] = useState(false); // State for loading spinner

  const handleRegister = async () => {
    setLoading(true);
    setError(null);

    try {
      await fetchWithErrorHandling(`${process.env.NEXT_PUBLIC_API_BASE_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      handleSuccess();
    } catch (error) {
      handleError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleError = (error: unknown) => {
    if (error instanceof BadRequestError) {
      setError(error.details ? Object.values(error.details.errors).flat().join(' ') : error.message);
    } else {
      console.error('Unexpected error during registration:', error);
      setError('An unexpected error occurred. Please try again later.');
    }
  };

  const handleSuccess = () => {
    router.push('/signin');
    toast('Account registered', {
      description: 'You can now login with the registered account',
      duration: 3000,
      position: 'top-center',
    });
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    handleRegister();
  };

  return (
    <div className="h-full justify-center flex flex-col items-center">
      <div className="flex flex-col gap-4 bg-white p-5 rounded-lg w-96">
        <h1 className="text-2xl text-center font-medium text-blue-500">Create an account</h1>
        <p className="text-center text-gray-600 text-sm">Enter your email below to create your account</p>
        {error && <AlertDestructive title="Error" description={error} />}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-row gap-4 w-full">
            <div className="w-1/2">
              <input
                type="text"
                required
                className="w-full p-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="First name"
              />
            </div>
            <div className="w-1/2">
              <input
                type="text"
                required
                className="w-full p-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Last name"
              />
            </div>
          </div>

          <div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full p-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Email"
            />
          </div>
          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full p-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Password"
            />
          </div>
          <Button
            className="w-full py-2.5 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            type="submit"
            disabled={loading}
          >
            {loading ? <Spinner /> : 'Sign Up'}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default SignUpPage;
