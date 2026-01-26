import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

export function Hero() {
    return (
        <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
            {/* Background Elements */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl -z-10 opacity-20 dark:opacity-10 pointer-events-none">
                <div className="absolute top-20 left-20 w-72 h-72 bg-blue-500 rounded-full blur-[100px]" />
                <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500 rounded-full blur-[100px]" />
            </div>

            <div className="container mx-auto px-4 text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/50 backdrop-blur-sm border border-border mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <Sparkles className="w-4 h-4 text-yellow-500" />
                    <span className="text-sm font-medium text-secondary-foreground">Framtidens læring er her</span>
                </div>

                <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
                    Din personlige <br className="hidden md:block" />
                    <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        talebaserte KI-assistent
                    </span>
                </h1>

                <p className="max-w-2xl mx-auto text-lg md:text-xl text-muted-foreground mb-10 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
                    Hallaien gir elever i videregående skole en unik mulighet til å øve på muntlige ferdigheter med en tålmodig og kunnskapsrik KI-partner.
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
                    <Link href="/auth/sign-up">
                        <Button size="lg" className="h-12 px-8 text-base rounded-full shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transition-all">
                            Kom i gang
                        </Button>
                    </Link>
                    <Link href="#features">
                        <Button variant="outline" size="lg" className="h-12 px-8 text-base rounded-full">
                            Les mer
                        </Button>
                    </Link>
                </div>
            </div>
        </section>
    );
}
