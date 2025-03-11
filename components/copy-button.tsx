import React from "react";
import { ComponentPropsWithoutRef, useState } from "react";
import copy from "copy-to-clipboard";
import { Check, Files } from "lucide-react";
import { cn } from "../lib/utils";

interface CopyIconButtonProps extends ComponentPropsWithoutRef<"button"> {
  message: string;
}
export function CopyIconButton({
  className,
  message,
  ...props
}: CopyIconButtonProps) {
  const [showCheck, setShowCheck] = useState(false);

  const handleOnClick = async () => {
    copy(message);
    setShowCheck(true);
    setTimeout(() => {
      setShowCheck(false);
    }, 4000);
  };

  return (
    <button
      type="button"
      className={cn("h-4 w-4 flex-shrink-0", className)}
      onClick={handleOnClick}
      {...props}
    >
      {showCheck ? (
        <Check className="h-full w-full text-green-500" />
      ) : (
        <Files className="h-full w-full cursor-pointer" />
      )}
    </button>
  );
}
