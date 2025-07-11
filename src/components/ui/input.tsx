
import * as React from "react"

import { cn } from "@/lib/utils"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  prefixIcon?: React.ReactNode;
  noAutoUppercase?: boolean; // New prop
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, style, onInput, prefixIcon, noAutoUppercase, ...rest }, ref) => {
    const handleInput = (event: React.FormEvent<HTMLInputElement>) => {
      const noAutoUppercaseTypes = ['password', 'tel', 'email', 'number', 'url', 'date'];
      const currentType = type || 'text';

      if (!noAutoUppercaseTypes.includes(currentType) && !noAutoUppercase) {
        event.currentTarget.value = event.currentTarget.value.toUpperCase();
      }
      
      if (onInput) {
        onInput(event);
      }
    };

    const inputClasses = cn(
      "flex h-10 w-full rounded-md border border-input bg-background py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
      !['password', 'tel', 'email', 'number', 'url', 'date'].includes(type || 'text') && !noAutoUppercase ? "uppercase" : "",
      prefixIcon ? "pl-10 pr-3" : "px-3",
      className
    );

    if (prefixIcon) {
      return (
        <div className="relative flex items-center w-full">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            {prefixIcon}
          </div>
          <input
            type={type}
            className={inputClasses}
            style={style}
            onInput={handleInput}
            ref={ref}
            autoComplete="off"
            {...rest}
          />
        </div>
      );
    }

    return (
      <input
        type={type}
        className={inputClasses}
        style={style}
        onInput={handleInput}
        ref={ref}
        autoComplete="off"
        {...rest}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
