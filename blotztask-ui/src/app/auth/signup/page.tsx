'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertDestructive } from '@/components/ui/alert-destructive';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import LoadingSpinner from '@/components/ui/loading-spinner';
import { RegisterFormData, registerUser } from '@/services/user-register-service';
import { BadRequestError } from '@/model/error/bad-request-error';
import { signUpSchema } from '../forms/auth-schema';

const SignUpPage = () => {
  const router = useRouter();

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(signUpSchema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    try {
      await registerUser(data);

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
      <div className="flex flex-col gap-4 bg-white p-5 rounded-lg w-full max-w-md sm:mx-auto">
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
          <p className="text-center text-sm text-gray-500 mt-4">
            Already have an account? <a href="/auth/signin" className="text-blue-500 underline">Sign in</a>
          </p>
        </form>
      </div>
    </div>
  );
};

export default SignUpPage;
