# Implementeringsplan: Talebaserte Chatboter for Skolen

## Prosjektoversikt

En nettside der lærere kan registrere og dele talebaserte assistenter (fra Eleven Labs) med elever. Lærere har full kontroll over sine egne assistenter og kan dele dem midlertidig via tidsbegrensede delingskoder.

## Teknologistack

- **Frontend**: Next.js 16 med TypeScript
- **UI**: Radix UI komponenter (allerede installert)
- **Database & Autentisering**: Supabase
- **Taleassistenter**: Eleven Labs API
- **Styling**: Tailwind CSS

---

## 1. Database-oppsett i Supabase

### 1.1 Tabeller

#### **Tabell: `user_roles`**
Definerer om en bruker er lærer eller elev.

```sql
CREATE TYPE user_role AS ENUM ('teacher', 'student');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'student',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own role"
  ON public.user_roles
  FOR SELECT
  USING (auth.uid() = id);

-- Automatisk opprett rolle ved brukerregistrering
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_roles (id, role)
  VALUES (NEW.id, 'student');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_role_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_role();
```

#### **Tabell: `assistants`**
Lagrer informasjon om assistenter som lærere har lagt til.

```sql
CREATE TABLE public.assistants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  elevenlabs_agent_id TEXT NOT NULL,
  elevenlabs_config JSONB, -- Ekstra konfigurasjon fra Eleven Labs
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX assistants_teacher_id_idx ON public.assistants(teacher_id);
CREATE INDEX assistants_created_at_idx ON public.assistants(created_at);

-- Enable RLS
ALTER TABLE public.assistants ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Teachers can view their own assistants"
  ON public.assistants
  FOR SELECT
  USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can insert their own assistants"
  ON public.assistants
  FOR INSERT
  WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Teachers can update their own assistants"
  ON public.assistants
  FOR UPDATE
  USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can delete their own assistants"
  ON public.assistants
  FOR DELETE
  USING (auth.uid() = teacher_id);
```

#### **Tabell: `share_codes`**
Lagrer delingskoder for assistenter.

```sql
CREATE TABLE public.share_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assistant_id UUID NOT NULL REFERENCES public.assistants(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  is_active BOOLEAN DEFAULT TRUE NOT NULL
);

-- Indexes
CREATE INDEX share_codes_code_idx ON public.share_codes(code);
CREATE INDEX share_codes_expires_at_idx ON public.share_codes(expires_at);
CREATE INDEX share_codes_assistant_id_idx ON public.share_codes(assistant_id);

-- Enable RLS
ALTER TABLE public.share_codes ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Teachers can view share codes for their assistants"
  ON public.share_codes
  FOR SELECT
  USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.assistants
      WHERE assistants.id = share_codes.assistant_id
      AND assistants.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can create share codes for their assistants"
  ON public.share_codes
  FOR INSERT
  WITH CHECK (
    created_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.assistants
      WHERE assistants.id = share_codes.assistant_id
      AND assistants.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can update their share codes"
  ON public.share_codes
  FOR UPDATE
  USING (created_by = auth.uid());

-- Funksjon for å generere unik 6-sifret kode
CREATE OR REPLACE FUNCTION generate_share_code()
RETURNS TEXT AS $$
DECLARE
  code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    -- Generer 6-sifret alfanumerisk kode
    code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6));

    -- Sjekk om koden eksisterer og er aktiv
    SELECT EXISTS(
      SELECT 1 FROM public.share_codes
      WHERE share_codes.code = code
      AND share_codes.is_active = TRUE
      AND share_codes.expires_at > NOW()
    ) INTO code_exists;

    EXIT WHEN NOT code_exists;
  END LOOP;

  RETURN code;
END;
$$ LANGUAGE plpgsql;
```

#### **Tabell: `student_assistant_access`**
Holder styr på hvilke elever som har tilgang til hvilke assistenter.

```sql
CREATE TABLE public.student_assistant_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assistant_id UUID NOT NULL REFERENCES public.assistants(id) ON DELETE CASCADE,
  share_code_id UUID NOT NULL REFERENCES public.share_codes(id) ON DELETE CASCADE,
  granted_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,

  UNIQUE(student_id, assistant_id)
);

-- Indexes
CREATE INDEX student_access_student_id_idx ON public.student_assistant_access(student_id);
CREATE INDEX student_access_assistant_id_idx ON public.student_assistant_access(assistant_id);
CREATE INDEX student_access_expires_at_idx ON public.student_assistant_access(expires_at);

-- Enable RLS
ALTER TABLE public.student_assistant_access ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Students can view their own access"
  ON public.student_assistant_access
  FOR SELECT
  USING (auth.uid() = student_id AND expires_at > NOW());

CREATE POLICY "Students can insert access via valid share codes"
  ON public.student_assistant_access
  FOR INSERT
  WITH CHECK (
    auth.uid() = student_id AND
    EXISTS (
      SELECT 1 FROM public.share_codes
      WHERE share_codes.id = share_code_id
      AND share_codes.is_active = TRUE
      AND share_codes.expires_at > NOW()
    )
  );

-- Tillegg til assistants-policy: elever kan se assistenter de har tilgang til
CREATE POLICY "Students can view assistants they have access to"
  ON public.assistants
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.student_assistant_access
      WHERE student_assistant_access.assistant_id = assistants.id
      AND student_assistant_access.student_id = auth.uid()
      AND student_assistant_access.expires_at > NOW()
    )
  );
```

### 1.2 Database Functions

#### **Funksjon: `activate_share_code`**
Brukes når en elev aktiverer en delingskode.

```sql
CREATE OR REPLACE FUNCTION public.activate_share_code(
  p_code TEXT,
  p_student_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_share_code public.share_codes;
  v_access_id UUID;
BEGIN
  -- Finn og verifiser delingskoden
  SELECT * INTO v_share_code
  FROM public.share_codes
  WHERE code = p_code
  AND is_active = TRUE
  AND expires_at > NOW();

  IF v_share_code IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Ugyldig eller utløpt delingskode'
    );
  END IF;

  -- Opprett eller oppdater tilgang
  INSERT INTO public.student_assistant_access (
    student_id,
    assistant_id,
    share_code_id,
    expires_at
  )
  VALUES (
    p_student_id,
    v_share_code.assistant_id,
    v_share_code.id,
    v_share_code.expires_at
  )
  ON CONFLICT (student_id, assistant_id)
  DO UPDATE SET
    expires_at = EXCLUDED.expires_at,
    share_code_id = EXCLUDED.share_code_id
  RETURNING id INTO v_access_id;

  RETURN jsonb_build_object(
    'success', TRUE,
    'access_id', v_access_id,
    'assistant_id', v_share_code.assistant_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 2. Sidestruktur i Next.js

### 2.1 Hovedsider

```
app/
├── auth/                          # Eksisterende autentiseringssider
│   ├── login/page.tsx
│   ├── sign-up/page.tsx
│   └── ...
│
├── dashboard/                     # Ny: Hovedside etter innlogging
│   ├── page.tsx                   # Viser riktig dashboard basert på rolle
│   └── layout.tsx
│
├── teacher/                       # Ny: Lærer-seksjonen
│   ├── layout.tsx                 # Layout med navigasjon for lærere
│   ├── page.tsx                   # Oversikt over egne assistenter
│   ├── assistants/
│   │   ├── page.tsx              # Liste over assistenter
│   │   ├── new/page.tsx          # Legg til ny assistent
│   │   ├── [id]/
│   │   │   ├── page.tsx          # Detaljer og rediger assistent
│   │   │   ├── chat/page.tsx     # Chat med assistent
│   │   │   └── share/page.tsx    # Dele-siden (generer koder)
│   │
├── student/                       # Ny: Elev-seksjonen
│   ├── layout.tsx                 # Layout for elever
│   ├── page.tsx                   # Oversikt over tilgjengelige assistenter
│   ├── activate/page.tsx          # Side for å aktivere delingskode
│   ├── assistants/
│   │   └── [id]/
│   │       └── chat/page.tsx     # Chat med assistent
│
├── api/                           # API-ruter
│   ├── assistants/
│   │   ├── route.ts              # GET, POST assistenter
│   │   └── [id]/
│   │       ├── route.ts          # GET, PUT, DELETE assistent
│   │       └── share/route.ts    # POST generer delingskode
│   ├── share-codes/
│   │   ├── activate/route.ts     # POST aktiver delingskode
│   │   └── [code]/route.ts       # GET verifiser kode
│   └── elevenlabs/
│       └── chat/route.ts          # Proxy til Eleven Labs API
│
├── layout.tsx                     # Root layout
├── page.tsx                       # Landing page
└── globals.css
```

### 2.2 Komponentstruktur

```
components/
├── layout/
│   ├── navbar.tsx                 # Navigasjonsmeny
│   ├── sidebar.tsx                # Sidebar for dashboard
│   └── footer.tsx
│
├── auth/
│   ├── role-selector.tsx          # Velg rolle ved registrering
│   └── protected-route.tsx        # HOC for beskyttede ruter
│
├── assistants/
│   ├── assistant-card.tsx         # Kort som viser assistent
│   ├── assistant-form.tsx         # Skjema for å legge til/redigere
│   ├── assistant-list.tsx         # Liste over assistenter
│   └── assistant-chat.tsx         # Chat-interface med Eleven Labs
│
├── sharing/
│   ├── share-code-generator.tsx   # Generere delingskode
│   ├── share-code-display.tsx     # Vise delingskode
│   ├── share-code-input.tsx       # Input for å taste inn kode
│   └── active-shares-list.tsx     # Liste over aktive delinger
│
└── ui/                            # Eksisterende UI-komponenter
    ├── button.tsx
    ├── card.tsx
    ├── input.tsx
    └── ...
```

---

## 3. Eleven Labs Integrasjon

### 3.1 Miljøvariabler

Legg til i `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY=your-anon-key
ELEVENLABS_API_KEY=your-elevenlabs-api-key
```

### 3.2 API-integrasjon

Opprett en service for Eleven Labs:

```typescript
// lib/elevenlabs/client.ts
export class ElevenLabsService {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  // Hent agent-informasjon
  async getAgent(agentId: string) {
    // Implementer API-kall
  }

  // Starte samtale med agent
  async startConversation(agentId: string) {
    // Implementer WebSocket-tilkobling
  }
}
```

---

## 4. Implementeringssteg

### Fase 1: Database-oppsett (Dag 1)
1. Opprett migrasjoner i Supabase
2. Kjør migrasjoner
3. Verifiser tabeller og policies i Supabase Dashboard
4. Test RLS-policies manuelt

### Fase 2: Autentisering og roller (Dag 2)
1. Utvid registreringsskjema med rollevelger
2. Opprett `user_roles`-tabell i database
3. Implementer beskyttede ruter basert på rolle
4. Lag redirect-logikk etter innlogging

### Fase 3: Lærer-funksjonalitet (Dag 3-4)
1. Opprett lærerdashboard
2. Implementer "Legg til assistent"-skjema
3. Lag assistent-liste og detaljvisning
4. Implementer CRUD-operasjoner for assistenter
5. Test at lærere bare ser egne assistenter

### Fase 4: Delingsfunksjonalitet (Dag 5)
1. Implementer genererering av delingskoder
2. Lag visning av aktive delingskoder
3. Implementer utløp av koder (automatisk)
4. Lag API-endepunkt for aktivering av koder

### Fase 5: Elev-funksjonalitet (Dag 6)
1. Opprett elevdashboard
2. Implementer side for å aktivere delingskode
3. Lag assistent-liste for elever
4. Test at elever kun ser assistenter de har tilgang til
5. Test at tilgang utløper etter 24 timer

### Fase 6: Chat-integrasjon med Eleven Labs (Dag 7-8)
1. Sett opp Eleven Labs API-nøkler
2. Implementer chat-komponent
3. Koble til Eleven Labs Conversational AI
4. Test tale-input og output
5. Håndter feilscenarier

### Fase 7: UI/UX-forbedringer (Dag 9)
1. Forbedre design og brukeropplevelse
2. Legg til laste-indikatorer
3. Implementer feilmeldinger og suksessmeldinger
4. Responsivt design for mobil

### Fase 8: Testing og feilretting (Dag 10)
1. Manuell testing av alle flyter
2. Test edge cases (utløpte koder, ugyldige koder, etc.)
3. Sikkerhetstesting av RLS-policies
4. Ytelsestesting

---

## 5. Sikkerhet og beste praksis

### 5.1 Row Level Security (RLS)
- Alle tabeller har RLS aktivert
- Policies sikrer at lærere bare ser egne assistenter
- Elever ser bare assistenter de har aktiv tilgang til
- Delingskoder kan bare brukes av elever

### 5.2 API-sikkerhet
- Eleven Labs API-nøkkel lagres som miljøvariabel
- API-kall til Eleven Labs går via server-side proxy
- Autentiseringssjekk på alle API-endepunkter

### 5.3 Input-validering
- Valider alle brukerinput både på klient og server
- Sanitiser data før lagring i database
- Sjekk at delingskoder er gyldige og ikke utløpt

---

## 6. Fremtidige forbedringer

### Versjon 2.0
- Analyser og statistikk for lærere
- Chat-historikk lagring
- Mulighet til å dele med flere elever samtidig
- Notifikasjoner når delingskode nærmer seg utløp
- Mulighet for lærere å se elevaktivitet
- Export av samtaler
- Tilpasse assistent-innstillinger per deling

### Versjon 3.0
- Klasserom-funksjonalitet (grupper av elever)
- Flerbruker-samtaler med samme assistent
- Integrering med Feide for skolepålogging
- Admin-panel for skoleadministratorer

---

## 7. Nyttige kommandoer

### Supabase
```bash
# Start lokal Supabase
npx supabase start

# Opprett ny migrering
npx supabase migration new <migration_name>

# Kjør migrasjoner
npx supabase db push

# Reset database
npx supabase db reset
```

### Next.js
```bash
# Start utviklingsserver
npm run dev

# Build for produksjon
npm run build

# Start produksjonsserver
npm start
```

---

## 8. Ressurser og dokumentasjon

- [Eleven Labs API Dokumentasjon](https://elevenlabs.io/docs)
- [Supabase Dokumentasjon](https://supabase.com/docs)
- [Next.js Dokumentasjon](https://nextjs.org/docs)
- [Radix UI Komponenter](https://www.radix-ui.com/)

---

## Vedlegg: Database ER-diagram

```
┌─────────────────┐
│   auth.users    │
│  (Supabase)     │
└────────┬────────┘
         │
         ├──────────────────────────┬──────────────────┐
         │                          │                  │
┌────────▼────────┐        ┌────────▼────────┐       │
│   user_roles    │        │   assistants    │       │
│                 │        │                 │       │
│ - id            │        │ - id            │       │
│ - role          │        │ - teacher_id ───┘       │
└─────────────────┘        │ - name          │       │
                           │ - description   │       │
                           │ - elevenlabs_id │       │
                           └────────┬────────┘       │
                                    │                │
                           ┌────────▼────────┐       │
                           │  share_codes    │       │
                           │                 │       │
                           │ - id            │       │
                           │ - assistant_id  │       │
                           │ - code          │       │
                           │ - expires_at    │       │
                           │ - created_by ───┘
                           └────────┬────────┘
                                    │
                    ┌───────────────▼───────────────┐
                    │ student_assistant_access      │
                    │                               │
                    │ - id                          │
                    │ - student_id ─────────────────┘
                    │ - assistant_id (FK)
                    │ - share_code_id (FK)
                    │ - expires_at
                    └───────────────────────────────┘
```

---

**Denne planen gir en komplett oversikt over hvordan systemet skal bygges, fra database til brukergrensesnitt.**
