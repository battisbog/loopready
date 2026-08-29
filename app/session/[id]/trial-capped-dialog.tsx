"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/shadcn/dialog";
import { Button } from "@/components/ui";

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
 */
export default function TrialCappedDialog({ open }: { open: boolean }) {
  return (
    <Dialog open={open}>
      <DialogContent showCloseButton={false} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-xl">
            That&rsquo;s a taste of a real interview
          </DialogTitle>
          <DialogDescription className="text-center leading-relaxed">
            Full interviews run about 40 minutes and go as deep as a real
            loop does. Pick a plan to run the whole thing — Free included.
          </DialogDescription>
        </DialogHeader>
        <Button href="/pricing" size="lg" className="mt-2 w-full">
          Explore plans
        </Button>
      </DialogContent>
    </Dialog>
  );
}
