'use client';

import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { AlertDestructive } from '@/components/ui/alert-destructive';
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
          message: 'Login Failed. Please check you credential',
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
    <div className="relative min-h-screen w-full overflow-hidden">
      <div className="relative z-10 flex items-center justify-center min-h-screen">
        <div className="flex flex-col gap-4 bg-white p-5 rounded-lg w-full max-w-md sm:mx-auto">
          <h1 className="text-2xl text-center font-medium text-blue-500">Welcome to Blotz</h1>
          <p className="text-center text-gray-600 text-sm"> Enter your email and password to start </p>
          {errors.root && <AlertDestructive title="Error" description={errors.root.message} />}
          <form onSubmit={handleSubmit(onSubmit)} className='space-y-4'>
            <input
              type="email"
              {...register('email')}
              className="w-full p-2 border border-gray-300 rounded"
              placeholder="Email"
            />
            {errors.email && <div className="text-warn text-sm">{errors.email.message}</div>}

            <input
              type="password"
              {...register('password')}
              className="w-full p-2 border border-gray-300 rounded"
              placeholder="Password"
            />
            {errors.password && <div className="text-warn text-sm">{errors.password.message}</div>}
            
            <Button
              className="w-full p-2.5 bg-blue-500 text-white border-none rounded cursor-pointer hover:bg-blue-600"
              type="submit"
              disabled={isSubmitting}
            >
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
    </div>
  );
};

export default LoginPage;
