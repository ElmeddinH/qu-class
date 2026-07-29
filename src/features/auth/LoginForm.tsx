"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { UNIVERSITY_EMAIL_EXAMPLE } from "@/lib/constants";
import { loginAction } from "./actions";
import { loginSchema, type LoginInput } from "./schemas";

interface LoginFormProps {
  /** Middleware-in qoyduğu `?callbackUrl=` — girişdən sonra qayıdılan ünvan. */
  callbackUrl?: string;
}

export function LoginForm({ callbackUrl }: LoginFormProps) {
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  function onSubmit(values: LoginInput) {
    setFormError(null);
    startTransition(async () => {
      // Uğur halında action yönləndirir və bura qayıtmır.
      const result = await loginAction(values, callbackUrl);
      if (!result.ok) setFormError(result.message ?? null);
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Universitet e-poçtu</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  autoComplete="email"
                  placeholder={UNIVERSITY_EMAIL_EXAMPLE}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Şifrə</FormLabel>
              <FormControl>
                <Input type="password" autoComplete="current-password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {formError ? (
          <p
            role="alert"
            className="rounded-input bg-danger/10 px-3 py-2 text-small text-danger-strong"
          >
            {formError}
          </p>
        ) : null}

        <Button type="submit" disabled={pending} className="mt-2 w-full">
          {pending ? (
            <>
              <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
              Yoxlanılır...
            </>
          ) : (
            "Daxil ol"
          )}
        </Button>
      </form>
    </Form>
  );
}
