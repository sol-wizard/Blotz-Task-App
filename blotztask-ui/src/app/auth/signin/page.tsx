'use client';

import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { SubmitHandler, useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import LoadingSpinner from '@/components/ui/loading-spinner';
import { loginSchema } from '../forms/auth-schema';

type LoginFormValues = z.infer<typeof loginSchema>;

const LoginPage = () => {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit: SubmitHandler<LoginFormValues> = async (formData: LoginFormValues) => {
    try {
      const result = await signIn('credentials', {
        redirect: false,
        email: formData.email,
        password: formData.password,
      });

      if (result?.error) {
        setError('root', {
          message: 'Login Failed. Please check your credentials',
        });
      } else {
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Login failed:', error);
      setError('root', {
        message: error,
      });
    }
  };

  return (
    <div className="h-full justify-center flex flex-col items-center">
      <div className="flex flex-col gap-4 bg-white p-5 rounded-lg w-full max-w-md sm:mx-auto">
        <h1 className="text-2xl text-center font-medium text-blue-500">Welcome to Blotz</h1>
        <p className="text-center text-gray-600 text-sm">Enter your email and password to start</p>
        {errors.root && (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{errors.root.message}</AlertDescription>
          </Alert>
        )}
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Input type="email" {...register('email')} placeholder="Email" className="w-full h-12" />
          {errors.email && <p className="text-red-500 text-sm">{errors.email.message}</p>}

          <Input type="password" {...register('password')} placeholder="Password" className="w-full h-12" />
          {errors.password && <p className="text-red-500 text-sm">{errors.password.message}</p>}

          <Button type="submit" disabled={isSubmitting} className="w-full bg-primary hover:bg-blue-600">
            {isSubmitting ? <LoadingSpinner className="text-[4px] mx-10" variant="white" /> : 'Log in'}
          </Button>
          <p className="text-center text-sm text-gray-500 mt-4">
            Don’t have an account?{' '}
            <a href="/auth/signup" className="text-blue-500 underline">
              Sign up
            </a>
          </p>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
