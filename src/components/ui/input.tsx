import * as React from "react"

import { cn } from "@/lib/utils"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  prefixIcon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, style, onInput, prefixIcon, ...rest }, ref) => {
    const handleInput = (event: React.FormEvent<HTMLInputElement>) => {
      // Only apply uppercase to general text inputs. Exclude password, tel, email, etc.
      const noAutoUppercaseTypes = ['password', 'tel', 'email', 'number', 'url', 'date']; // Add more as needed
      const currentType = type || 'text'; // Default to 'text' if type is undefined

      if (!noAutoUppercaseTypes.includes(currentType)) {
        event.currentTarget.value = event.currentTarget.value.toUpperCase();
      }
      
      // Call original onInput if it exists
      if (onInput) {
        onInput(event);
      }
    };

    const inputClasses = cn(
      "flex h-10 w-full rounded-md border border-input bg-background py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
      // Uppercase class is conditional based on type, matching handleInput logic
      !['password', 'tel', 'email', 'number', 'url', 'date'].includes(type || 'text') ? "uppercase" : "",
      prefixIcon ? "pl-10 pr-3" : "px-3", // Add left padding if prefixIcon exists
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
        {...rest}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
