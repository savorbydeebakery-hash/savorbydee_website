"use client";

import { useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";

/**
 * A password box with a show/hide eye button over its right end (client
 * request, 2026-10-29). Used on sign-in and on the reset-password page.
 *
 * The button is labelled "Show password", so anything locating the box by
 * label should use the exact label: see e2e/helpers/sign-in.ts.
 */
export function PasswordInput({
  label = "Password",
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & { label?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input {...props} label={label} type={show ? "text" : "password"} className="w-full pr-12" />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        aria-label={show ? "Hide password" : "Show password"}
        aria-pressed={show}
        className="absolute bottom-0 right-0 flex h-[42px] w-12 items-center justify-center rounded-r-xl text-ink-soft hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-pink/40"
      >
        {show ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}
