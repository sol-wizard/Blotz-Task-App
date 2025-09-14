import BrandingSection from './components/branding-section';
import AuthButton from './components/auth-button';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex h-screen w-full overflow-hidden">
      <div className="absolute top-4 right-4 md:top-8 md:right-8">
        <AuthButton />
      </div>

      <BrandingSection />

      <div className="flex flex-col flex-[3] items-center justify-center">
        <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">{children}</div>
      </div>
    </div>
  );
}
