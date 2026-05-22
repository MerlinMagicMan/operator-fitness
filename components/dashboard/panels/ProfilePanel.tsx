"use client";

import { useActionState, useEffect, useState } from "react";
import { Check, Save, User } from "lucide-react";
import type { ActionResult, ProfileRow } from "@/lib/operator-types";
import { USER_DEFAULTS } from "@/lib/operator-constants";
import { updateProfileForm } from "@/app/actions/update-profile";
import { PanelHeader } from "../Primitives";

type FieldProps = {
  label: string;
  name: string;
  hint?: string;
  type?: "text" | "number" | "textarea";
  step?: string;
  defaultValue?: string | number | null;
  placeholder?: string;
};

function Field({
  label,
  name,
  hint,
  type = "text",
  step,
  defaultValue,
  placeholder,
}: FieldProps) {
  const valStr =
    defaultValue == null || defaultValue === "" ? "" : String(defaultValue);
  return (
    <label className="block">
      <div className="mb-1 flex items-baseline justify-between text-[10px] tracking-widest text-zinc-500">
        <span>{label}</span>
        {hint && <span className="text-zinc-700">{hint}</span>}
      </div>
      {type === "textarea" ? (
        <textarea
          name={name}
          defaultValue={valStr}
          placeholder={placeholder}
          rows={4}
          className="w-full resize-y border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-100 focus:border-[var(--color-amber)] focus:outline-none"
        />
      ) : (
        <input
          type={type}
          inputMode={type === "number" ? "decimal" : undefined}
          name={name}
          step={step}
          defaultValue={valStr}
          placeholder={placeholder}
          className="w-full border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-100 focus:border-[var(--color-amber)] focus:outline-none"
        />
      )}
    </label>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3 border border-zinc-900 bg-zinc-950 p-4">
      <div className="text-[10px] tracking-widest text-zinc-500">{title}</div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{children}</div>
    </div>
  );
}

export function ProfilePanel({ profile }: { profile: ProfileRow | null }) {
  const [state, action, pending] = useActionState<
    ActionResult | null,
    FormData
  >(updateProfileForm, null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    if (state && "success" in state) setSavedAt(Date.now());
  }, [state]);

  const proteinPlaceholder = "1.00";
  const fatPlaceholder = "0.27";

  return (
    <div className="space-y-4 p-4">
      <PanelHeader icon={User} label="PROFILE & SETTINGS" />

      <p className="text-xs text-zinc-500">
        Edit anything here, or ask the coach in chat (e.g. &ldquo;switch me to
        keto, 25g net carbs max&rdquo;) and they&rsquo;ll write it for you.
      </p>

      <form action={action} className="space-y-4">
        <Section title="IDENTITY">
          <Field
            label="DISPLAY NAME"
            name="display_name"
            defaultValue={profile?.display_name ?? ""}
            placeholder="Joe"
          />
          <Field
            label="TIMEZONE"
            name="timezone"
            hint="IANA, e.g. America/Chicago"
            defaultValue={profile?.timezone ?? ""}
            placeholder="America/Chicago"
          />
          <Field
            label="AGE (years)"
            name="age_years"
            type="number"
            step="1"
            defaultValue={profile?.age_years ?? ""}
            placeholder={String(USER_DEFAULTS.ageYears)}
          />
          <Field
            label="HEIGHT (inches)"
            name="height_inches"
            type="number"
            step="0.25"
            defaultValue={profile?.height_inches ?? ""}
            placeholder={String(USER_DEFAULTS.heightInches)}
          />
        </Section>

        <Section title="GOALS">
          <Field
            label="START WEIGHT (lb)"
            name="start_weight_lb"
            type="number"
            step="0.1"
            defaultValue={profile?.start_weight_lb ?? ""}
            placeholder={String(USER_DEFAULTS.startWeightLb)}
          />
          <Field
            label="GOAL WEIGHT (lb)"
            name="weight_goal_lb"
            type="number"
            step="0.1"
            defaultValue={profile?.weight_goal_lb ?? ""}
            placeholder={String(USER_DEFAULTS.goalWeightLb)}
          />
          <Field
            label="BODY FAT GOAL (%)"
            name="bf_goal_pct"
            type="number"
            step="0.1"
            defaultValue={profile?.bf_goal_pct ?? ""}
            placeholder="12"
          />
          <Field
            label="ACTIVITY MULTIPLIER"
            name="activity_multiplier"
            hint="1.2 sedentary → 1.9 athlete"
            type="number"
            step="0.05"
            defaultValue={profile?.activity_multiplier ?? ""}
            placeholder={String(USER_DEFAULTS.activityMultiplier)}
          />
          <div className="sm:col-span-2">
            <Field
              label="GOAL NOTES"
              name="goals_notes"
              type="textarea"
              defaultValue={profile?.goals_notes ?? ""}
              placeholder="What are you chasing? Sub-7 mile, drop to 230, etc."
            />
          </div>
        </Section>

        <Section title="DIET & MACROS">
          <Field
            label="DIET STYLE"
            name="diet_style"
            hint="free text — keto / standard / low-carb"
            defaultValue={profile?.diet_style ?? ""}
            placeholder="keto"
          />
          <Field
            label="CUT DEFICIT (kcal/day)"
            name="cut_deficit_kcal"
            hint="negative = surplus"
            type="number"
            step="50"
            defaultValue={profile?.cut_deficit_kcal ?? ""}
            placeholder={String(USER_DEFAULTS.cutDeficitKcal)}
          />
          <Field
            label="PROTEIN g/lb BODYWEIGHT"
            name="protein_g_per_lb"
            type="number"
            step="0.05"
            defaultValue={profile?.protein_g_per_lb ?? ""}
            placeholder={proteinPlaceholder}
          />
          <Field
            label="FAT % OF CALORIES"
            name="fat_pct_of_calories"
            hint="0.27 = 27%"
            type="number"
            step="0.01"
            defaultValue={profile?.fat_pct_of_calories ?? ""}
            placeholder={fatPlaceholder}
          />
          <Field
            label="NET CARB CAP (g/day)"
            name="net_carbs_max_g"
            hint="set this for keto / low-carb"
            type="number"
            step="1"
            defaultValue={profile?.net_carbs_max_g ?? ""}
            placeholder="25"
          />
          <div className="sm:col-span-2">
            <Field
              label="DIET NOTES"
              name="diet_notes"
              type="textarea"
              defaultValue={profile?.diet_notes ?? ""}
              placeholder="On strict keto. <25g net carbs. No grains, no sugar. Electrolytes daily."
            />
          </div>
        </Section>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center gap-2 border px-4 py-2 text-[10px] tracking-widest transition disabled:opacity-50"
            style={{
              color: "var(--color-amber)",
              borderColor:
                "color-mix(in oklab, var(--color-amber) 50%, transparent)",
            }}
          >
            <Save className="h-3 w-3" aria-hidden />
            {pending ? "SAVING…" : "SAVE PROFILE"}
          </button>
          {state && "error" in state && (
            <span className="text-xs text-[var(--color-red)]">
              {state.error}
            </span>
          )}
          {state && "success" in state && savedAt && (
            <span
              className="inline-flex items-center gap-1 text-xs"
              style={{ color: "var(--color-emerald)" }}
            >
              <Check className="h-3 w-3" aria-hidden /> Saved
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
