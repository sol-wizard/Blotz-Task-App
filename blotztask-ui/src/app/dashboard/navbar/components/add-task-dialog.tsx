'use client';

import { useState, createContext, useContext } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
} from '@/components/ui/alert-dialog';

const DialogContext = createContext({ openDialog: () => {} });

export function DialogProvider({ children }) {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <DialogContext.Provider
      value={{
        openDialog: () => {
          setDialogOpen(true);
          console.log('Dialog is open');
        },
      }}
    >
      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {children}
    </DialogContext.Provider>
  );
}

export function useDialog() {
  return useContext(DialogContext);
}
