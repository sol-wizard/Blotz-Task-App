import { toast } from 'sonner';

export const showWarningToast = (message: string) => {
  toast(message, {
    classNames: {
      toast: 'bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800',
      title: 'text-yellow-700 font-semibold',
      description: 'text-yellow-600',
      actionButton: 'bg-yellow-200 text-yellow-800 hover:bg-yellow-300',
      cancelButton: 'bg-yellow-300 text-yellow-900 hover:bg-yellow-400',
      closeButton: 'text-yellow-600 hover:text-yellow-800',
    },
  });
};