"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ShieldAlert } from "lucide-react";
import { useState, useEffect } from "react";
import { AccessDenied } from "./AccessDenied";

interface GhostModeModalProps {
  isOpen?: boolean;
  status: string;
  actionSummary?: string;
  message?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

export function GhostModeModal({
  isOpen,
  status,
  actionSummary,
  message,
  onConfirm = () => { },
  onCancel = () => { }
}: GhostModeModalProps) {
  // Prevent hydration mismatch
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  // Handle Access Denied State (Viewer attempted dangerous action)
  if (status === "denied") {
    return <AccessDenied reason={message} />;
  }

  // Handle Default/Closed State
  if (!isOpen) return null;

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent className="border-red-500/50 bg-red-950/10">
        <AlertDialogHeader>
          <div className="flex items-center gap-2 text-red-600">
            <ShieldAlert className="h-6 w-6" />
            <AlertDialogTitle>Ghost Mode: Confirmation Required</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-foreground">
            You are about to execute a high-risk action:
            <br />
            <span className="font-mono font-bold text-red-500 mt-2 block bg-muted p-2 rounded">
              {actionSummary}
            </span>
            <br />
            This action cannot be undone. Are you sure you want to proceed?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            Confirm Execution
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
