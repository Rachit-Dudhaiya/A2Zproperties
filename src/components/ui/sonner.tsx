import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      richColors
      position="top-right"
      toastOptions={{
        classNames: {
          toast:
            "group toast font-sans rounded-xl border shadow-lg group-[.toaster]:bg-card group-[.toaster]:text-card-foreground group-[.toaster]:border-border",
          description: "group-[.toast]:text-muted-foreground text-sm",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground font-medium rounded-lg",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground rounded-lg",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
