"use client";

import { useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MIN_PASSWORD_LENGTH, UNIVERSITY_EMAIL_EXAMPLE } from "@/lib/constants";
import type { FacultyOption } from "@/services/academic.service";
import { registerAction } from "./actions";
import { registerSchema, type RegisterInput } from "./schemas";

interface RegisterFormProps {
  /** Fakültə → ixtisas → qəbul ili kataloqu (yalnız cohort-u mövcud olanlar). */
  faculties: FacultyOption[];
}

export function RegisterForm({ faculties }: RegisterFormProps) {
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
      facultyId: "",
      programId: "",
      admissionYear: "",
    },
  });

  // Asılı select-lər: fakültə → ixtisas → qəbul ili.
  const facultyId = form.watch("facultyId");
  const programId = form.watch("programId");

  const programs = useMemo(
    () => faculties.find((f) => f.id === facultyId)?.programs ?? [],
    [faculties, facultyId],
  );

  const admissionYears = useMemo(
    () => programs.find((p) => p.id === programId)?.admissionYears ?? [],
    [programs, programId],
  );

  function onSubmit(values: RegisterInput) {
    setFormError(null);
    startTransition(async () => {
      // Uğur halında action giriş edib yönləndirir və bura qayıtmır.
      const result = await registerAction(values);
      if (result.ok) return;

      if (result.field && result.field in values) {
        form.setError(result.field as keyof RegisterInput, {
          message: result.message,
        });
      } else {
        setFormError(result.message ?? null);
      }
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ad</FormLabel>
                <FormControl>
                  <Input autoComplete="given-name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Soyad</FormLabel>
                <FormControl>
                  <Input autoComplete="family-name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

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
              <FormDescription>
                Yalnız universitet e-poçtu ilə qeydiyyat mümkündür.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Şifrə</FormLabel>
                <FormControl>
                  <Input type="password" autoComplete="new-password" {...field} />
                </FormControl>
                <FormDescription>
                  Ən azı {MIN_PASSWORD_LENGTH} simvol, hərf və rəqəm.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Şifrənin təkrarı</FormLabel>
                <FormControl>
                  <Input type="password" autoComplete="new-password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="facultyId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Fakültə</FormLabel>
              <Select
                value={field.value}
                onValueChange={(value) => {
                  field.onChange(value);
                  // Asılı seçimlər sıfırlanır — köhnə ixtisas yeni fakültəyə aid deyil.
                  form.setValue("programId", "");
                  form.setValue("admissionYear", "");
                }}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Fakültə seçin" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {faculties.map((faculty) => (
                    <SelectItem key={faculty.id} value={faculty.id}>
                      {faculty.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="programId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>İxtisas</FormLabel>
                <Select
                  value={field.value}
                  disabled={programs.length === 0}
                  onValueChange={(value) => {
                    field.onChange(value);
                    form.setValue("admissionYear", "");
                  }}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          programs.length === 0 ? "Əvvəlcə fakültə seçin" : "İxtisas seçin"
                        }
                      />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {programs.map((program) => (
                      <SelectItem key={program.id} value={program.id}>
                        {program.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="admissionYear"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Qəbul ili</FormLabel>
                <Select
                  value={field.value}
                  disabled={admissionYears.length === 0}
                  onValueChange={field.onChange}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          admissionYears.length === 0 ? "Əvvəlcə ixtisas seçin" : "İl seçin"
                        }
                      />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {admissionYears.map((year) => (
                      <SelectItem key={year} value={String(year)}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

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
              Hesab yaradılır...
            </>
          ) : (
            "Qeydiyyatdan keç"
          )}
        </Button>
      </form>
    </Form>
  );
}
