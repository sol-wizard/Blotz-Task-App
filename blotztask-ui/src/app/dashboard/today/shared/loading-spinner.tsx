const LoadingSpinner = () => {
  return (
    <div className="flex justify-center items-center min-h-screen">
      <div>
        <div
          className="mb-12 ml-8 text-[10px] w-[1em] h-[1em] rounded-full animate-mul-shd-spin"
          style={{ textIndent: '-9999em', transform: 'translateZ(0)' }}
        ></div>
        <p className="font-semibold text-zinc-600">Loading...</p>
      </div>
    </div>
  );
};

export default LoadingSpinner;
