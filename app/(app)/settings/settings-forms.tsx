"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Badge,
  Button,
  Card,
  CardLabel,
  Field,
  Input,
  Section,
} from "@/components/ui";

type Note = { tone: "ok" | "error"; text: string } | null;

export default function SettingsForms({
  email,
  emailNotifications,
}: {
  email: string;
  emailNotifications: boolean;
}) {
  return (
    <>
      <EmailForm current={email} />
      <PasswordForm />
      <NotificationForm initial={emailNotifications} />
      <DangerZone email={email} />
    </>
  );
}

function Notice({ note }: { note: Note }) {
  if (!note) return null;
  return (
    <p
      role="status"
      className={`mt-3 text-sm ${note.tone === "ok" ? "text-success" : "text-error"}`}
    >
      {note.text}
    </p>
  );
}

function EmailForm({ current }: { current: string }) {
  const [value, setValue] = useState(current);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<Note>(null);

  async function save() {
    if (!value || value === current) return;
    setBusy(true);
    setNote(null);
    const { error } = await createClient().auth.updateUser({ email: value });
    setBusy(false);
    setNote(
      error
        ? { tone: "error", text: error.message }
        : {
            tone: "ok",
            text: "Check your new inbox for a confirmation link. Your email changes once you confirm.",
          }
    );
  }

  return (
    <Section title="Email">
      <Card>
        <Field label="Email address" htmlFor="email">
          <Input
            id="email"
            type="email"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </Field>
        <div className="mt-4">
          <Button onClick={save} disabled={busy || value === current} size="sm">
            {busy ? "Saving…" : "Update email"}
          </Button>
        </div>
        <Notice note={note} />
      </Card>
    </Section>
  );
}

function PasswordForm() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<Note>(null);

  async function save() {
    if (password.length < 8) {
      return setNote({ tone: "error", text: "Use at least 8 characters." });
    }
    if (password !== confirm) {
      return setNote({ tone: "error", text: "Both passwords must match." });
    }
    setBusy(true);
    setNote(null);
    const { error } = await createClient().auth.updateUser({ password });
    setBusy(false);
    if (error) return setNote({ tone: "error", text: error.message });
    setPassword("");
    setConfirm("");
    setNote({ tone: "ok", text: "Password updated." });
  }

  return (
    <Section title="Password">
      <Card>
        <div className="space-y-4">
          <Field label="New password" htmlFor="pw">
            <Input
              id="pw"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
          </Field>
          <Field label="Confirm new password" htmlFor="pw2">
            <Input
              id="pw2"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
            />
          </Field>
        </div>
        <div className="mt-4">
          <Button onClick={save} disabled={busy} size="sm">
            {busy ? "Saving…" : "Change password"}
          </Button>
        </div>
        <Notice note={note} />
      </Card>
    </Section>
  );
}

function NotificationForm({ initial }: { initial: boolean }) {
  const [on, setOn] = useState(initial);
  const [note, setNote] = useState<Note>(null);

  async function toggle() {
    const next = !on;
    setOn(next);
    setNote(null);
    const res = await fetch("/api/account/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emailNotifications: next }),
    });
    if (!res.ok) {
      setOn(!next); // revert on failure
      setNote({ tone: "error", text: "Could not save. Try again." });
    }
  }

  return (
    <Section title="Notifications">
      <Card className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-primary">Email notifications</p>
          <p className="mt-1 text-sm text-secondary">
            Occasional product updates and interview reminders.
          </p>
          <Notice note={note} />
        </div>
        <button
          onClick={toggle}
          role="switch"
          aria-checked={on}
          aria-label="Email notifications"
          className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
            on ? "bg-accent" : "bg-elevated"
          }`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
              on ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
        </button>
      </Card>
    </Section>
  );
}

function DangerZone({ email }: { email: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<Note>(null);

  async function destroy() {
    setBusy(true);
    setNote(null);
    try {
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not delete account");
      await createClient().auth.signOut();
      router.push("/");
      router.refresh();
    } catch (e) {
      setBusy(false);
      setNote({
        tone: "error",
        text: e instanceof Error ? e.message : "Could not delete account",
      });
    }
  }

  return (
    <Section title="Danger zone">
      <Card className="border-error/30">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-primary">Delete account</p>
              <Badge tone="error">Permanent</Badge>
            </div>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-secondary">
              This removes your login and every interview, transcript, debrief
              and credit permanently. Any active subscription is cancelled
              first. It cannot be undone.
            </p>
          </div>
          {!open && (
            <Button variant="danger" size="sm" onClick={() => setOpen(true)}>
              Delete account
            </Button>
          )}
        </div>

        {open && (
          <div className="mt-5 rounded-md border border-error/30 bg-error-muted p-4">
            <p className="text-sm text-primary">
              Type <span className="font-mono text-error">{email}</span> to
              confirm.
            </p>
            <Input
              className="mt-3"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder={email}
              autoComplete="off"
            />
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                variant="danger"
                size="sm"
                onClick={destroy}
                disabled={busy || confirm.trim().toLowerCase() !== email.toLowerCase()}
              >
                {busy ? "Deleting…" : "Permanently delete"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setOpen(false);
                  setConfirm("");
                  setNote(null);
                }}
                disabled={busy}
              >
                Cancel
              </Button>
            </div>
            <Notice note={note} />
          </div>
        )}
      </Card>
    </Section>
  );
}
