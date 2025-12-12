'use client';

import { forwardRef, useState, InputHTMLAttributes } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RomnaInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  icon?: React.ElementType;
  error?: string;
  success?: boolean;
  showPasswordToggle?: boolean;
}

export const RomnaInput = forwardRef<HTMLInputElement, RomnaInputProps>(
  ({ icon: Icon, error, success, showPasswordToggle, type, className, ...props }, ref) => {
    const [isFocused, setIsFocused] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const inputType = showPasswordToggle ? (showPassword ? 'text' : 'password') : type;

    return (
      <div className="space-y-1.5">
        <div className="romna-input-wrapper">
          {Icon && (
            <motion.div
              animate={{ 
                scale: isFocused ? 1.1 : 1, 
                color: isFocused ? 'var(--accent)' : error ? 'var(--destructive)' : 'var(--muted-foreground)' 
              }}
              transition={{ duration: 0.2 }}
              className="romna-input-icon"
            >
              <Icon className="w-5 h-5" />
            </motion.div>
          )}
          
          <input
            ref={ref}
            type={inputType}
            onFocus={(e) => {
              setIsFocused(true);
              props.onFocus?.(e);
            }}
            onBlur={(e) => {
              setIsFocused(false);
              props.onBlur?.(e);
            }}
            className={cn(
              "romna-input",
              !Icon && "!pl-4 rtl:!pr-4",
              (showPasswordToggle || success || error) && "!pr-12 rtl:!pl-12",
              error && "romna-input-error",
              success && "romna-input-success",
              className
            )}
            {...props}
          />

          {showPasswordToggle && (
            <motion.button
              type="button"
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowPassword(!showPassword)}
              className="romna-input-toggle"
            >
              <AnimatePresence mode="wait">
                {showPassword ? (
                  <motion.div
                    key="hide"
                    initial={{ opacity: 0, rotate: -90 }}
                    animate={{ opacity: 1, rotate: 0 }}
                    exit={{ opacity: 0, rotate: 90 }}
                    transition={{ duration: 0.15 }}
                  >
                    <EyeOff className="w-5 h-5" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="show"
                    initial={{ opacity: 0, rotate: -90 }}
                    animate={{ opacity: 1, rotate: 0 }}
                    exit={{ opacity: 0, rotate: 90 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Eye className="w-5 h-5" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          )}

          {!showPasswordToggle && success && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="romna-input-toggle pointer-events-none"
            >
              <CheckCircle className="w-5 h-5 text-success" />
            </motion.div>
          )}

          {!showPasswordToggle && error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="romna-input-toggle pointer-events-none"
            >
              <AlertCircle className="w-5 h-5 text-destructive" />
            </motion.div>
          )}
        </div>

        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -4, height: 0 }}
              className="text-[13px] text-destructive font-medium px-1"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    );
  }
);

RomnaInput.displayName = 'RomnaInput';
