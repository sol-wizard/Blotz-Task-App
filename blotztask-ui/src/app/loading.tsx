//TODO: Made a shared loading component for the whole application - the same loading compoent is used in the daashboard layout
export default function Loading() {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80">
        <div className="text-primary text-xl">Loading dashboard...</div>
      </div>
    );
  }