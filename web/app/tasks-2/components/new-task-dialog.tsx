"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
  FieldTitle,
  FieldContent,
} from "@/components/ui/field";
import { useForm } from "@tanstack/react-form";
import z from "zod";
import { toast } from "sonner";
import { MultiSelect, type MultiSelectOption } from "@/components/multi-select";
import { DatePicker } from "@/components/date-picker";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";

export function NewTaskDialog() {
  const [isOpen, setIsOpen] = useState(false);

  const skillsOptions: MultiSelectOption[] = [
    { label: "React", value: "react" },
    { label: "TypeScript", value: "typescript" },
    { label: "Next.js", value: "nextjs" },
    { label: "Node.js", value: "nodejs" },
    { label: "Python", value: "python" },
    { label: "Go", value: "go" },
    { label: "Rust", value: "rust" },
    { label: "GraphQL", value: "graphql" },
    { label: "PostgreSQL", value: "postgresql" },
    { label: "MongoDB", value: "mongodb" },
  ];

  const priorities = [
    { label: "1", value: "1" },
    { label: "2", value: "2" },
    { label: "3", value: "3" },
    { label: "4", value: "4" },
    { label: "5", value: "5" },
  ] as const;

  const statuses = [
    { label: "To Do", value: "todo" },
    { label: "Doing", value: "doing" },
    { label: "Done", value: "Done" },
  ] as const;

  const TaskStatusSchema = z.enum(["todo", "doing", "done"]);
  const TaskPrioritySchema = z.coerce.number().int().min(1).max(5);
  const formSchema = z.object({
    title: z
      .string()
      .min(1, "Title is required")
      .max(120, "Title must be 120 characters or less")
      .trim(),
    status: TaskStatusSchema.default("todo"),
    priority: TaskPrioritySchema.default(3),
    dueDate: z.iso.datetime().nullable(),
    tags: z.array(z.string()),
  });

  const form = useForm({
    defaultValues: {
      title: "",
      status: "todo",
      priority: 1,
      dueDate: null,
      tags: [],
    },
    validators: {
      onSubmit: formSchema,
    },
    onSubmit: async ({ value }) => {
      console.log({ value });
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_API_URL}/api/tasks`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
            "Content-Type": "application/json",
          },

          body: JSON.stringify(value),
        }
      );
      if (!res.ok) {
        throw new Error("Failed to fetch deployments");
      }
      setIsOpen(false);
      return res.json();
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <form>
        <DialogTrigger asChild>
          <Button>New Task</Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
          </DialogHeader>
          <form
            id="new-task-form"
            onSubmit={(e) => {
              e.preventDefault();
              form.handleSubmit();
            }}
          >
            <FieldGroup className="gap-4">
              <form.Field
                name="title"
                children={(field) => {
                  const isInvalid =
                    field.state.meta.isTouched && !field.state.meta.isValid;
                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor={field.name}>Title</FieldLabel>
                      <Input
                        id={field.name}
                        name={field.name}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        aria-invalid={isInvalid}
                        placeholder="m@example.com"
                        autoComplete="off"
                      />
                      {isInvalid && (
                        <FieldError errors={field.state.meta.errors} />
                      )}
                    </Field>
                  );
                }}
              />

              <form.Field
                name="status"
                children={(field) => {
                  const isInvalid =
                    field.state.meta.isTouched && !field.state.meta.isValid;
                  return (
                    <Field orientation="responsive" data-invalid={isInvalid}>
                      <FieldContent>
                        <FieldLabel htmlFor="form-tanstack-select-language">
                          Status
                        </FieldLabel>
                        {isInvalid && (
                          <FieldError errors={field.state.meta.errors} />
                        )}
                      </FieldContent>
                      <Select
                        name={field.name}
                        value={String(field.state.value ?? "")}
                        onValueChange={(value) => field.handleChange(value)}
                      >
                        <SelectTrigger
                          id="form-tanstack-select-language"
                          aria-invalid={isInvalid}
                          className="min-w-[120px]"
                        >
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent position="item-aligned">
                          <SelectItem value="auto">Auto</SelectItem>
                          <SelectSeparator />
                          {statuses.map((status) => (
                            <SelectItem key={status.value} value={status.value}>
                              {status.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  );
                }}
              />

              <form.Field
                name="priority"
                children={(field) => {
                  const isInvalid =
                    field.state.meta.isTouched && !field.state.meta.isValid;
                  return (
                    <Field orientation="responsive" data-invalid={isInvalid}>
                      <FieldContent>
                        <FieldLabel htmlFor="form-tanstack-select-language">
                          Priority
                        </FieldLabel>
                        {isInvalid && (
                          <FieldError errors={field.state.meta.errors} />
                        )}
                      </FieldContent>
                      <Select
                        name={field.name}
                        value={String(field.state.value ?? "")}
                        onValueChange={(value) =>
                          field.handleChange(Number(value))
                        }
                      >
                        <SelectTrigger
                          id="form-tanstack-select-language"
                          aria-invalid={isInvalid}
                          className="min-w-[120px]"
                        >
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                        <SelectContent position="item-aligned">
                          <SelectItem value="auto">Auto</SelectItem>
                          <SelectSeparator />
                          {priorities.map((priority) => (
                            <SelectItem
                              key={priority.value}
                              value={priority.value}
                            >
                              {priority.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  );
                }}
              />

              <form.Field name="dueDate">
                {(field) => (
                  <Field data-invalid={!!field.state.meta.errors.length}>
                    <FieldLabel htmlFor={field.name}>
                      <FieldTitle>Due Date</FieldTitle>
                    </FieldLabel>
                    <FieldContent>
                      <DatePicker
                        id={field.name}
                        value={
                          (field.state.value ?? undefined) as string | undefined
                        }
                        onChange={(date) => field.handleChange(date)}
                        placeholder="Select due date"
                      />
                      <FieldError
                        errors={field.state.meta.errors.map((error) => ({
                          message: error,
                        }))}
                      />
                    </FieldContent>
                  </Field>
                )}
              </form.Field>

              <form.Field name="tags">
                {(field) => (
                  <Field data-invalid={field.state.meta.errors.length > 0}>
                    <FieldLabel htmlFor="skills">Tags</FieldLabel>
                    <MultiSelect
                      id="tags"
                      options={skillsOptions}
                      value={field.state.value}
                      onChange={(value) => field.handleChange(value)}
                      placeholder="Select tags"
                      emptyText="No tags found"
                    />
                    <FieldError errors={field.state.meta.errors} />
                  </Field>
                )}
              </form.Field>

              <DialogFooter>
                <Field orientation="horizontal" className="justify-end">
                  <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                  </DialogClose>
                  <Button type="submit" form="new-task-form">
                    Create
                  </Button>
                </Field>
              </DialogFooter>
            </FieldGroup>
          </form>
        </DialogContent>
      </form>
    </Dialog>
  );
}
