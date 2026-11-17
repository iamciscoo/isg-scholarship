"use client";
import { Button } from "@/components/ui/button";
export default function ErrorPage({ reset }: { reset: () => void }) { return <main id="main" className="success-panel"><h1>Let’s try that again.</h1><p>This page could not be loaded. Your information has not been shared publicly. Try again, or contact ISG if the problem continues.</p><Button onClick={reset}>Try again</Button></main>; }
