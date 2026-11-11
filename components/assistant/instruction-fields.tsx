'use client'

import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DEFAULT_VOICE, GEMINI_VOICES } from '@/lib/gemini/voices'

type Props = Readonly<{
    defaultInstruction?: string
    defaultVoice?: string
}>

export const INSTRUCTION_MAX_LENGTH = 20000

export function InstructionFields({ defaultInstruction = '', defaultVoice = DEFAULT_VOICE }: Props) {
    return (
        <>
            <div className="space-y-2">
                <Label htmlFor="system_instruction">Systeminstruks *</Label>
                <Textarea
                    id="system_instruction"
                    name="system_instruction"
                    defaultValue={defaultInstruction}
                    placeholder={'F.eks. Du er en kunde i en blomsterbutikk som skal kjøpe bukett til et bryllup. Snakk norsk, hold svarene korte, og la eleven lede samtalen.'}
                    rows={8}
                    maxLength={INSTRUCTION_MAX_LENGTH}
                    required
                />
                <p className="text-sm text-muted-foreground">
                    Beskriv hvem assistenten er, hvordan den skal oppføre seg og hva eleven skal øve på. Elevene ser ikke instruksen.
                </p>
            </div>

            <div className="space-y-2">
                <Label htmlFor="voice">Stemme</Label>
                <Select name="voice" defaultValue={defaultVoice}>
                    <SelectTrigger id="voice" className="w-full">
                        <SelectValue placeholder="Velg stemme" />
                    </SelectTrigger>
                    <SelectContent>
                        {GEMINI_VOICES.map(v => (
                            <SelectItem key={v.id} value={v.id}>{v.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </>
    )
}
