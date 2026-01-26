import { Mic, Shield, Zap, GraduationCap, Languages, Brain } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const features = [
    {
        title: "Muntlig trening",
        description: "Øv på uttale og flyt med en KI som forstår og svarer naturlig på norsk og andre språk.",
        icon: Mic,
        color: "text-blue-500",
    },
    {
        title: "Personlig tilpasning",
        description: "Assistenten tilpasser nivået og temaene basert på elevens behov og fagplanen.",
        icon: Brain,
        color: "text-purple-500",
    },
    {
        title: "Trygt skolemiljø",
        description: "Bygget med personvern i fokus og innholdsfiltrering tilpasset skolehverdagen.",
        icon: Shield,
        color: "text-green-500",
    },
    {
        title: "Flere språk",
        description: "Støtte for engelsk, spansk, tysk og fransk for bred språkøving.",
        icon: Languages,
        color: "text-orange-500",
    },
    {
        title: "Eksamensforberedelse",
        description: "Simuler muntlige eksamenssituasjoner for å redusere nervøsitet og øke mestring.",
        icon: GraduationCap,
        color: "text-red-500",
    },
    {
        title: "Umiddelbar respons",
        description: "Få tilbakemeldinger i sanntid uten å måtte vente på lærerens rettelser.",
        icon: Zap,
        color: "text-yellow-500",
    },
];

export function Features() {
    return (
        <section id="features" className="py-24 bg-secondary/30">
            <div className="container mx-auto px-4">
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <h2 className="text-3xl font-bold tracking-tight mb-4">Hvorfor velge Hallaien?</h2>
                    <p className="text-muted-foreground text-lg">
                        Vår plattform er skreddersydd for å møte behovene i den moderne videregående skolen.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {features.map((feature, index) => (
                        <Card key={index} className="border-border/50 bg-background/50 backdrop-blur-sm hover:border-primary/50 transition-colors">
                            <CardHeader>
                                <div className={`w-12 h-12 rounded-lg bg-background border flex items-center justify-center mb-4 ${feature.color}`}>
                                    <feature.icon className="w-6 h-6" />
                                </div>
                                <CardTitle>{feature.title}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground">
                                    {feature.description}
                                </p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </section>
    );
}
