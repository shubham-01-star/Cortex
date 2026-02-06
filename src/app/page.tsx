import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Database, MessageSquare, ShieldCheck } from "lucide-react";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Hero Section */}
      <section className="flex flex-1 flex-col items-center justify-center space-y-10 px-6 py-24 text-center">
        <div className="space-y-4">
          <h1 className="text-6xl font-extrabold tracking-tighter sm:text-7xl bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
            CORTEX
          </h1>
          <p className="mx-auto max-w-[700px] text-2xl text-muted-foreground font-light">
            Chat with your system. See your data. <br />
            <span className="font-medium text-foreground">No SQL required.</span>
          </p>
        </div>

        <div className="flex gap-4">
          <Link href="/login">
            <Button size="lg" className="h-12 px-8 text-lg rounded-full">
              Enter Command
            </Button>
          </Link>
          <Link href="https://github.com/your-repo/cortex" target="_blank">
            <Button variant="outline" size="lg" className="h-12 px-8 text-lg rounded-full">
              View Source
            </Button>
          </Link>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="container mx-auto grid max-w-5xl grid-cols-1 gap-6 px-6 pb-24 md:grid-cols-3">
        <Card className="bg-muted/50 border-none shadow-none">
          <CardHeader>
            <Database className="h-10 w-10 text-blue-500 mb-2" />
            <CardTitle>Invisible Database</CardTitle>
          </CardHeader>
          <CardContent>
            Interact with your Supabase data without ever writing a query. 
            Cortex understands your schema automatically.
          </CardContent>
        </Card>

        <Card className="bg-muted/50 border-none shadow-none">
          <CardHeader>
            <MessageSquare className="h-10 w-10 text-cyan-500 mb-2" />
            <CardTitle>Generative UI</CardTitle>
          </CardHeader>
          <CardContent>
            Your words become interfaces. Ask for "High value users" and get an interactive table, not raw text.
          </CardContent>
        </Card>

        <Card className="bg-muted/50 border-none shadow-none">
          <CardHeader>
            <ShieldCheck className="h-10 w-10 text-emerald-500 mb-2" />
            <CardTitle>Ghost Mode</CardTitle>
          </CardHeader>
          <CardContent>
            Enterprise-grade safety. High-risk actions require explicit confirmation. 
            RBAC is enforced at the tool level.
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
