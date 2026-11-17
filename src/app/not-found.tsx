import Link from "next/link";
import { Button } from "@/components/ui/button";
export default function NotFound() { return <main id="main" className="success-panel"><span className="eyebrow">Page not found</span><h1>Let’s get you back on track.</h1><p>This address doesn’t lead to a page. You can return home or start with an eligibility assessment.</p><Button asChild><Link href="/">Back to ISG</Link></Button></main>; }
