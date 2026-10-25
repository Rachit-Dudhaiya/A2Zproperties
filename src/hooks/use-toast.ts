import * as React from "react";
import { toast as sonnerToast } from "sonner";
import type { ToastActionElement, ToastProps } from "@/components/ui/toast";

type ToasterToast = ToastProps & {
  id?: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: ToastActionElement;
};

type Toast = Omit<ToasterToast, "id">;

function toast({ title, description, variant, action }: Toast) {
  let toastId: string | number;
  const options = description ? { description: description as any } : undefined;

  if (variant === "destructive") {
    toastId = sonnerToast.error(title as any, options);
  } else {
    toastId = sonnerToast(title as any, options);
  }

  return {
    id: String(toastId),
    dismiss: () => sonnerToast.dismiss(toastId),
    update: () => {},
  };
}

function useToast() {
  return {
    toasts: [],
    toast,
    dismiss: (toastId?: string) => sonnerToast.dismiss(toastId),
  };
}

export { useToast, toast };

