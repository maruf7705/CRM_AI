"use client";

import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, message: null };
  }

  public static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true, message: null };
  }

  public componentDidCatch(error: Error): void {
    this.setState({ message: error.message });
  }

  public render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4">
          <h2 className="text-xl font-semibold">Something went wrong</h2>
          {this.state.message ? <p className="max-w-md text-center text-sm text-muted-foreground">{this.state.message}</p> : null}
          <div className="flex items-center gap-2">
            <Button onClick={() => this.setState({ hasError: false, message: null })}>Try again</Button>
            <Link href="/" className="text-sm text-muted-foreground underline underline-offset-4">
              Go home
            </Link>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
