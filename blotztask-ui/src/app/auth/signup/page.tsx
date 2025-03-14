'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertDestructive } from '@/components/ui/alert-destructive';
import { BadRequestError } from '@/model/error/bad-request-error';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import LoadingSpinner from '@/components/ui/loading-spinner';

const SignUpPage = () => {
  const router = useRouter();
  const schema = z.object({
    firstName: z.string(),
    lastName: z.string(),
    email: z.string().email({ message: 'Invalid email address' }),
    password: z.string().min(9, { message: 'Password must be at least 9 characters' }),
  });

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: { firstName: string; lastName: string; email: string; password: string }) => {
    try {
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

      toast.success('Account registered', {
        description: 'You can now login with the registered account',
        duration: 3000,
        position: 'top-center',
      });

      router.push('/auth/signin');
    } catch (error) {
      if (error instanceof BadRequestError) {
        setError('root', { message: error.message });
      } else {
        toast.error('Unexpected error occurred. Please try again.');
      }
    }
  };

  return (
    <div className="h-full justify-center flex flex-col items-center">
      <div className="flex flex-col gap-4 bg-white p-5 rounded-lg w-96">
        <h1 className="text-2xl text-center font-medium text-blue-500">Create an account</h1>
        <p className="text-center text-gray-600 text-sm">Enter your email below to create your account</p>
        {errors.root && <AlertDestructive title="Error" description={errors.root?.message} />}
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-row gap-4 w-full">
            <div className="w-1/2">
              <Controller
                name="firstName"
                control={control}
                rules={{ required: 'First name is required' }}
                render={({ field }) => (
                  <Input
                    {...field}
                    type="text"
                    required
                    className="w-full p-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="First name"
                  />
                )}
              />
            </div>
            <div className="w-1/2">
              <Controller
                name="lastName"
                control={control}
                rules={{ required: 'Last name is required' }}
                render={({ field }) => (
                  <Input
                    {...field}
                    type="text"
                    required
                    className="w-full p-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Last name"
                  />
                )}
              />
            </div>
          </div>

          <div>
            <Controller
              name="email"
              control={control}
              rules={{ required: 'Email is required' }}
              render={({ field }) => (
                <Input
                  {...field}
                  type="email"
                  placeholder="Email"
                  className="w-full p-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              )}
            />
            {errors.email?.message && <p className="text-red-500 text-sm">{String(errors.email.message)}</p>}
          </div>
          <div>
            <Controller
              name="password"
              control={control}
              rules={{ required: 'Password is required' }}
              render={({ field }) => (
                <Input
                  {...field}
                  type="password"
                  placeholder="Password"
                  className="w-full p-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              )}
            />
            {errors.password?.message && (
              <p className="text-red-500 text-sm">{String(errors.password.message)}</p>
            )}
          </div>
          <Button
            className="w-full py-2.5 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? <LoadingSpinner className="text-[4px] mx-10" variant="white" /> : 'Sign Up'}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default SignUpPage;
