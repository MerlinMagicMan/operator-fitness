"use client";

import { useMemo, useState } from "react";
import {
  Sparkles,
  Trash2,
  Play,
  BookOpen,
  CalendarRange,
  FileUp,
  Layers,
} from "lucide-react";
import { PanelHeader } from "../Primitives";
import { GenerateProgramModal } from "./programs/GenerateProgramModal";
import { ImportProgramModal } from "./programs/ImportProgramModal";
import { ProgramDetailModal } from "./programs/ProgramDetailModal";
import { SessionViewModal } from "./programs/SessionViewModal";
import { enrollProgram } from "@/app/actions/enroll-program";
import { unenrollProgram } from "@/app/actions/unenroll-program";
import { deleteProgram } from "@/app/actions/delete-program";
import type {
  ProgramArchetype,
  ProgramEnrollmentRow,
  ProgramRow,
  ProgramSessionRow,
  SessionCompletionRow,
} from "@/lib/operator-types";

const ARCHETYPE_LABEL: Record<ProgramArchetype, string> = {
  bodyweight_mobility: "BW MOBILITY",
  banded_mobility: "BANDED MOBILITY",
  loaded_mobility: "LOADED MOBILITY",
  advanced_loaded_mobility: "ADV LOADED MOB",
  bodyweight_conditioning: "BW CONDITIONING",
  dynamic_strength: "DYNAMIC STRENGTH",
  functional_sc: "FUNCTIONAL S&C",
  custom: "CUSTOM",
};

type DetailTarget = {
  program: ProgramRow;
  enrollmentId: string | null;
};

type SelectedSession = {
  session: ProgramSessionRow;
  enrollmentId: string | null;
  programName: string;
};

export function ProgramsPanel({
  programs,
  enrollments,
  sessions,
  completions,
}: {
  programs: ProgramRow[];
  enrollments: ProgramEnrollmentRow[];
  sessions: ProgramSessionRow[];
  completions: SessionCompletionRow[];
}) {
  const [genOpen, setGenOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [detail, setDetail] = useState<DetailTarget | null>(null);
  const [selected, setSelected] = useState<SelectedSession | null>(null);

  const sessionsByProgram = useMemo(() => {
    const map = new Map<string, ProgramSessionRow[]>();
    for (const s of sessions) {
      const list = map.get(s.program_id) ?? [];
      list.push(s);
      map.set(s.program_id, list);
    }
    for (const [, list] of map) {
      list.sort((a, b) =>
        a.week === b.week ? a.day_of_week - b.day_of_week : a.week - b.week,
      );
    }
    return map;
  }, [sessions]);

  const activeEnrollments = enrollments.filter((e) => e.status === "active");
  const activeProgramIds = new Set(activeEnrollments.map((e) => e.program_id));
  const libraryPrograms = programs.filter((p) => !activeProgramIds.has(p.id));

  const completionsByEnrollment = useMemo(() => {
    const map = new Map<string, Map<string, SessionCompletionRow>>();
    for (const c of completions) {
      const inner =
        map.get(c.enrollment_id) ?? new Map<string, SessionCompletionRow>();
      inner.set(`${c.week}:${c.day_of_week}`, c);
      map.set(c.enrollment_id, inner);
    }
    return map;
  }, [completions]);

  const detailSessions = useMemo(() => {
    if (!detail) return [];
    return sessionsByProgram.get(detail.program.id) ?? [];
  }, [detail, sessionsByProgram]);

  const detailCompletions = useMemo(() => {
    if (!detail || !detail.enrollmentId) return [];
    return completions.filter((c) => c.enrollment_id === detail.enrollmentId);
  }, [detail, completions]);

  const selectedCompletion = useMemo(() => {
    if (!selected || !selected.enrollmentId) return null;
    const inner = completionsByEnrollment.get(selected.enrollmentId);
    if (!inner) return null;
    return (
      inner.get(`${selected.session.week}:${selected.session.day_of_week}`) ??
      null
    );
  }, [selected, completionsByEnrollment]);

  return (
    <div className="grid grid-cols-1 gap-px bg-zinc-900 lg:grid-cols-12">
      <section className="bg-black p-4 lg:col-span-7">
        <div className="mb-3 flex items-center justify-between border-b border-zinc-800 pb-2">
          <div className="flex items-center gap-2">
            <BookOpen
              className="h-3.5 w-3.5"
              style={{ color: "var(--color-amber)" }}
              aria-hidden
            />
            <span className="text-[10px] tracking-widest text-zinc-400">
              PROGRAM LIBRARY
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setImportOpen(true)}
              className="flex items-center gap-1 border px-3 py-1 text-[10px] tracking-widest"
              style={{
                borderColor: "var(--color-cyan)",
                color: "var(--color-cyan)",
              }}
            >
              <FileUp className="h-3 w-3" aria-hidden />
              IMPORT PDF
            </button>
            <button
              type="button"
              onClick={() => setGenOpen(true)}
              className="flex items-center gap-1 border px-3 py-1 text-[10px] tracking-widest"
              style={{
                borderColor: "var(--color-amber)",
                color: "var(--color-amber)",
              }}
            >
              <Sparkles className="h-3 w-3" aria-hidden />
              GENERATE
            </button>
          </div>
        </div>
        {libraryPrograms.length === 0 ? (
          <p className="py-6 text-center text-[11px] text-zinc-500">
            No programs in library. GENERATE one with the Coach or IMPORT a PDF
            you own.
          </p>
        ) : (
          <ul className="space-y-2">
            {libraryPrograms.map((p) => (
              <ProgramRowItem
                key={p.id}
                program={p}
                sessionCount={sessionsByProgram.get(p.id)?.length ?? 0}
                onView={() => setDetail({ program: p, enrollmentId: null })}
              />
            ))}
          </ul>
        )}
      </section>

      <section className="bg-black p-4 lg:col-span-5">
        <PanelHeader icon={CalendarRange} label="ACTIVE PROGRAMS" />
        {activeEnrollments.length === 0 ? (
          <p className="py-6 text-center text-[11px] text-zinc-500">
            Not enrolled in any programs yet. Enroll one from the library.
          </p>
        ) : (
          <ul className="space-y-3">
            {activeEnrollments.map((e) => {
              const program = programs.find((p) => p.id === e.program_id);
              if (!program) return null;
              const inner = completionsByEnrollment.get(e.id);
              const completedCount = inner?.size ?? 0;
              return (
                <ActiveEnrollmentItem
                  key={e.id}
                  program={program}
                  enrollment={e}
                  completedCount={completedCount}
                  onOpen={() => setDetail({ program, enrollmentId: e.id })}
                />
              );
            })}
          </ul>
        )}
      </section>

      <GenerateProgramModal open={genOpen} onClose={() => setGenOpen(false)} />
      <ImportProgramModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
      />
      <ProgramDetailModal
        open={detail !== null}
        onClose={() => setDetail(null)}
        program={detail?.program ?? null}
        sessions={detailSessions}
        enrollmentId={detail?.enrollmentId ?? null}
        completions={detailCompletions}
        onOpenSession={(session) => {
          if (!detail) return;
          setSelected({
            session,
            enrollmentId: detail.enrollmentId,
            programName: detail.program.name,
          });
        }}
      />
      <SessionViewModal
        open={selected !== null}
        onClose={() => setSelected(null)}
        session={selected?.session ?? null}
        enrollmentId={selected?.enrollmentId ?? null}
        existingCompletion={selectedCompletion}
        programName={selected?.programName ?? ""}
      />
    </div>
  );
}

function ProgramRowItem({
  program,
  sessionCount,
  onView,
}: {
  program: ProgramRow;
  sessionCount: number;
  onView: () => void;
}) {
  const expectedCount = program.weeks * program.days_per_week;
  const incomplete = sessionCount !== expectedCount;
  return (
    <li className="border border-zinc-800 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-xs text-zinc-100">
              {program.name}
            </span>
            <span
              className="text-[9px] tracking-widest"
              style={{ color: "var(--color-cyan)" }}
            >
              {ARCHETYPE_LABEL[program.archetype]}
            </span>
          </div>
          <div className="mt-1 text-[10px] text-zinc-500">
            {program.weeks}w · {program.days_per_week}d/wk
            {program.session_minutes_avg
              ? ` · ~${program.session_minutes_avg} min`
              : ""}
            {program.equipment.length > 0
              ? ` · ${program.equipment.join(", ")}`
              : ""}
          </div>
          {program.focus_areas.length > 0 && (
            <div className="mt-0.5 text-[10px] text-zinc-500">
              FOCUS: {program.focus_areas.join(", ")}
            </div>
          )}
          {incomplete && (
            <div className="mt-0.5 text-[10px] text-[var(--color-red)]">
              {sessionCount}/{expectedCount} sessions present
            </div>
          )}
        </div>
        <div className="flex flex-none items-center gap-1">
          <button
            type="button"
            onClick={onView}
            className="border border-zinc-700 px-2 py-1 text-[10px] tracking-widest text-zinc-300 hover:text-zinc-100"
          >
            VIEW
          </button>
          <EnrollButton programId={program.id} />
          <DeleteButton programId={program.id} programName={program.name} />
        </div>
      </div>
    </li>
  );
}

function EnrollButton({ programId }: { programId: string }) {
  return (
    <form action={enrollProgram}>
      <input type="hidden" name="program_id" value={programId} />
      <button
        type="submit"
        className="flex items-center gap-1 border px-2 py-1 text-[10px] tracking-widest"
        style={{
          borderColor: "var(--color-emerald)",
          color: "var(--color-emerald)",
        }}
      >
        <Play className="h-2.5 w-2.5" aria-hidden />
        ENROLL
      </button>
    </form>
  );
}

function DeleteButton({
  programId,
  programName,
}: {
  programId: string;
  programName: string;
}) {
  return (
    <form
      action={deleteProgram}
      onSubmit={(e) => {
        if (
          !confirm(
            `Delete "${programName}"? This removes all sessions and any active enrollment.`,
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="program_id" value={programId} />
      <button
        type="submit"
        aria-label="Delete program"
        className="border border-zinc-800 p-1 text-zinc-600 hover:text-[var(--color-red)]"
      >
        <Trash2 className="h-3 w-3" aria-hidden />
      </button>
    </form>
  );
}

function ActiveEnrollmentItem({
  program,
  enrollment,
  completedCount,
  onOpen,
}: {
  program: ProgramRow;
  enrollment: ProgramEnrollmentRow;
  completedCount: number;
  onOpen: () => void;
}) {
  const totalSessions = program.weeks * program.days_per_week;
  return (
    <li className="border border-zinc-800 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs text-zinc-100">{program.name}</div>
          <div className="mt-0.5 text-[10px] text-zinc-500">
            STARTED {enrollment.started_on} · WEEK {enrollment.current_week}/
            {program.weeks} · {completedCount}/{totalSessions} done
          </div>
        </div>
        <div className="flex flex-none items-center gap-1">
          <button
            type="button"
            onClick={onOpen}
            className="flex items-center gap-1 border px-2 py-1 text-[10px] tracking-widest"
            style={{
              borderColor: "var(--color-amber)",
              color: "var(--color-amber)",
            }}
          >
            <Layers className="h-2.5 w-2.5" aria-hidden />
            OPEN
          </button>
          <UnenrollButton enrollmentId={enrollment.id} />
        </div>
      </div>
    </li>
  );
}

function UnenrollButton({ enrollmentId }: { enrollmentId: string }) {
  return (
    <form
      action={unenrollProgram}
      onSubmit={(e) => {
        if (
          !confirm(
            "End this enrollment? Completed sessions stay in your history.",
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="enrollment_id" value={enrollmentId} />
      <button
        type="submit"
        className="border border-zinc-800 px-2 py-1 text-[10px] tracking-widest text-zinc-500 hover:text-[var(--color-red)]"
      >
        END
      </button>
    </form>
  );
}
