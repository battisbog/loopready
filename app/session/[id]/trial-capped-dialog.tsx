"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/shadcn/dialog";
import { Button } from "@/components/ui/shadcn/button";

/**
 * The end of a first-ever session (see sessions.trial_capped). Rendered as a
 * sibling of InterviewShell, not in place of it: Dialog's own overlay is what
 * dims the still-mounted interview underneath, rather than a hand-rolled
 * fixed-position div reimplementing what the primitive already does
 * (backdrop, focus trap, escape/outside-click handling, animation).
 *
 * `open` only ever goes false→true, never back -- this is a one-way exit
 * screen, not a dismissible dialog, so there is no onOpenChange: there is
 * nothing to return to inside the capped session.
 *
 * The icon badge + centered layout is the standard shadcn "upgrade" dialog
 * shape (an Icon in a tinted circle above the title), not a bespoke look --
 * see e.g. the shadcn examples gallery's own alert/upsell dialogs.
 */
export default function TrialCappedDialog({ open }: { open: boolean }) {
  return (
    <Dialog open={open}>
      <DialogContent showCloseButton={false} className="sm:max-w-sm">
        <DialogHeader className="items-center text-center sm:text-center">
          <div className="flex size-11 items-center justify-center rounded-full bg-accent-muted">
            <Sparkles className="size-5 text-accent" />
          </div>
          <DialogTitle className="text-xl">
            That&rsquo;s a taste of a real interview
          </DialogTitle>
          <DialogDescription className="leading-relaxed">
            Full interviews run about 40 minutes and go as deep as a real
            loop does. Pick a plan to run the whole thing, free plan
            included.
          </DialogDescription>
        </DialogHeader>
        <Button asChild variant="accent" size="lg" className="w-full">
          <Link href="/pricing">Explore plans</Link>
        </Button>
      </DialogContent>
    </Dialog>
  );
}
