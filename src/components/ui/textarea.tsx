
import * as React from 'react';

import {cn} from '@/lib/utils';

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<'textarea'>>(
  ({className, style, onInput, ...props}, ref) => {
    const handleInput = (event: React.FormEvent<HTMLTextAreaElement>) => {
      event.currentTarget.value = event.currentTarget.value.toUpperCase();
      // Call original onInput if it exists
      if (onInput) {
        onInput(event);
      }
    };

    return (
      <textarea
        className={cn(
          'flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
          "uppercase",
          className
        )}
        style={style}
        onInput={handleInput}
        ref={ref}
        autoComplete="off"
        {...props}
      />
    );
  }
);
Textarea.displayName = 'Textarea';

export {Textarea};
