import Link from "next/link";
import { Github, Twitter, Linkedin } from "lucide-react";

export function Footer() {
    return (
        <footer className="border-t border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container mx-auto px-4 py-12 md:py-24">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
                    <div className="md:col-span-2 space-y-4">
                        <h3 className="text-xl font-bold font-[family-name:var(--font-roboto-slab)] bg-gradient-to-r from-[#9ADBE8] to-[#3CDBC0] bg-clip-text text-transparent">
                            Hallaien
                        </h3>
                        <p className="text-muted-foreground max-w-xs">
                            Morgendagens læringsplattform for muntlig språktrening i skolen.
                        </p>
                    </div>

                    <div className="space-y-4">
                        <h4 className="text-sm font-medium">Produkt</h4>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li><Link href="#" className="hover:text-foreground transition-colors">Funksjoner</Link></li>
                            <li><Link href="#" className="hover:text-foreground transition-colors">Priser</Link></li>
                            <li><Link href="#" className="hover:text-foreground transition-colors">For skoler</Link></li>
                        </ul>
                    </div>

                    <div className="space-y-4">
                        <h4 className="text-sm font-medium">Selskap</h4>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li><Link href="#" className="hover:text-foreground transition-colors">Om oss</Link></li>
                            <li><Link href="#" className="hover:text-foreground transition-colors">Kontakt</Link></li>
                            <li><Link href="#" className="hover:text-foreground transition-colors">Personvern</Link></li>
                        </ul>
                    </div>
                </div>

                <div className="mt-12 pt-8 border-t border-border/40 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-xs text-muted-foreground">
                        &copy; {new Date().getFullYear()} Hallaien. Alle rettigheter reservert.
                    </p>
                    <div className="flex items-center gap-4">
                        <Link href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                            <Twitter className="h-4 w-4" />
                            <span className="sr-only">Twitter</span>
                        </Link>
                        <Link href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                            <Github className="h-4 w-4" />
                            <span className="sr-only">GitHub</span>
                        </Link>
                        <Link href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                            <Linkedin className="h-4 w-4" />
                            <span className="sr-only">LinkedIn</span>
                        </Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}
