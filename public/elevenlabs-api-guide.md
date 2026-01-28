# Fremgangsmåte: Sette opp ElevenLabs API-ruter

## Innholdsfortegnelse
1. [Oversikt](#oversikt)
2. [Forutsetninger](#forutsetninger)
3. [Prosjektstruktur](#prosjektstruktur)
4. [Trinn-for-trinn Guide](#trinn-for-trinn-guide)
5. [Autentiseringsmønstre](#autentiseringsmønstre)
6. [ElevenLabs API-integrasjon](#elevenlabs-api-integrasjon)
7. [Database-integrasjon](#database-integrasjon)
8. [Feilhåndtering](#feilhåndtering)
9. [Komplette Eksempler](#komplette-eksempler)

---

## Oversikt

Dette dokumentet beskriver hvordan du setter opp API-ruter for ElevenLabs-integrasjon i en Next.js 15 applikasjon basert på mønstrene fra dette prosjektet.

**Teknologistack:**
- Next.js 15.5.9 (App Router)
- TypeScript 5
- NextAuth.js 4.24.13 (autentisering)
- Prisma 6.18.0 (database ORM)
- SQLite (database)
- ElevenLabs ConvAI API

---

## Forutsetninger

### Miljøvariabler
Opprett en `.env.local` fil med følgende:

```bash
# Database
DATABASE_URL="file:./prisma/testDB.db"

# NextAuth
NEXTAUTH_SECRET=<din_lange_tilfeldige_streng>
NEXTAUTH_URL=http://localhost:3000/

# Feide (OIDC) - Valgfritt
FEIDE_CLIENT_ID=<din_client_id>
FEIDE_CLIENT_SECRET=<din_client_secret>
FEIDE_ISSUER=<din_feide_issuer>

# ElevenLabs
ELEVENLABS_API_KEY=<din_elevenlabs_api_key>
NEXT_PUBLIC_AGENT_ID=<agent_id>
ELEVENLABS_VOICE_ID=<voice_id>
```

### Avhengigheter
```bash
npm install @elevenlabs/elevenlabs-js@^2.15.0
npm install @elevenlabs/react@^0.6.2
npm install next-auth@^4.24.13
npm install @prisma/client@^6.18.0
```

---

## Prosjektstruktur

```
din-app/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── agents/
│   │   │   │   ├── route.ts              # POST: Opprett agent
│   │   │   │   └── [agent_id]/
│   │   │   │       └── route.ts          # GET/PATCH/DELETE: Agent operasjoner
│   │   │   ├── assign-agent/
│   │   │   │   └── route.ts              # POST: Tildel agent til student
│   │   │   ├── student-agents/
│   │   │   │   └── route.ts              # GET: Hent studentens agenter
│   │   │   ├── list-agents/
│   │   │   │   └── route.ts              # GET: List alle agenter
│   │   │   └── get-signed-url/
│   │   │       └── route.ts              # GET: WebSocket URL
│   │   └── home/
│   │       ├── teacher/                   # Lærersider
│   │       └── student/                   # Studentsider
│   ├── lib/
│   │   └── prisma.ts                      # Prisma client singleton
│   ├── types/
│   │   └── next-auth.d.ts                 # Type definisjoner
│   ├── auth.config.ts                     # NextAuth konfigurasjon
│   ├── auth.ts                            # NextAuth instance
│   └── middleware.ts                      # Rutebeskyttelse
├── prisma/
│   ├── schema.prisma                      # Database schema
│   └── migrations/                        # Database migrasjoner
└── public/
    └── avatars/                           # Agent avatarer
```

---

## Trinn-for-trinn Guide

### Steg 1: Opprett API-rute fil

Opprett en ny fil i `src/app/api/din-rute/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import config from "@/auth.config";

// Eksporter HTTP metoder du trenger
export async function GET(req: NextRequest) {
    // GET logikk
}

export async function POST(req: NextRequest) {
    // POST logikk
}

export async function PATCH(req: NextRequest) {
    // PATCH logikk
}

export async function DELETE(req: NextRequest) {
    // DELETE logikk
}
```

### Steg 2: Legg til autentisering

```typescript
export async function POST(req: NextRequest) {
    // Hent brukerens session
    const session = await getServerSession(config);

    // Sjekk om bruker er autentisert
    if (!session?.user?.id) {
        return NextResponse.json(
            { error: "Ikke autentisert" },
            { status: 401 }
        );
    }

    // Sjekk brukerens rolle
    if (session.user.role !== "TEACHER") {
        return NextResponse.json(
            { error: "Kun lærere har tilgang" },
            { status: 403 }
        );
    }

    // Fortsett med rute-logikk...
}
```

### Steg 3: Parse request data

```typescript
export async function POST(req: NextRequest) {
    const session = await getServerSession(config);

    if (!session?.user?.id || session.user.role !== "TEACHER") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        // Parse JSON body
        const body = await req.json();
        const { name, description, voiceId } = body;

        // Valider input
        if (!name || !voiceId) {
            return NextResponse.json(
                { error: "Navn og voiceId er påkrevd" },
                { status: 400 }
            );
        }

        // Fortsett...
    } catch (error) {
        return NextResponse.json(
            { error: "Ugyldig request body" },
            { status: 400 }
        );
    }
}
```

### Steg 4: Integrer med ElevenLabs API

```typescript
export async function POST(req: NextRequest) {
    const session = await getServerSession(config);

    if (!session?.user?.id || session.user.role !== "TEACHER") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();

        // Sjekk at API key er konfigurert
        const API_KEY = process.env.ELEVENLABS_API_KEY;
        if (!API_KEY) {
            return NextResponse.json(
                { error: "ElevenLabs API key ikke konfigurert" },
                { status: 500 }
            );
        }

        // Kall ElevenLabs API
        const response = await fetch(
            'https://api.eu.residency.elevenlabs.io/v1/convai/agents/create',
            {
                method: 'POST',
                headers: {
                    'xi-api-key': API_KEY,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    conversation_config: body.conversation_config,
                    name: body.name,
                    tags: body.tags || [],
                }),
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error('ElevenLabs API error:', errorText);
            return NextResponse.json(
                { error: 'Feil ved opprettelse av agent', details: errorText },
                { status: response.status }
            );
        }

        const data = await response.json();

        // Fortsett med database lagring...

    } catch (error) {
        console.error('Error:', error);
        return NextResponse.json(
            { error: 'Server feil', details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}
```

### Steg 5: Lagre data i database

```typescript
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
    const session = await getServerSession(config);

    if (!session?.user?.id || session.user.role !== "TEACHER") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const API_KEY = process.env.ELEVENLABS_API_KEY;

        if (!API_KEY) {
            return NextResponse.json({ error: "API key missing" }, { status: 500 });
        }

        // Kall ElevenLabs API
        const response = await fetch(
            'https://api.eu.residency.elevenlabs.io/v1/convai/agents/create',
            {
                method: 'POST',
                headers: {
                    'xi-api-key': API_KEY,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    conversation_config: body.conversation_config,
                    name: body.name,
                    tags: body.tags || [],
                }),
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            return NextResponse.json(
                { error: 'ElevenLabs API feil', details: errorText },
                { status: response.status }
            );
        }

        const elevenLabsData = await response.json();

        // Lagre i database
        const agent = await prisma.agent.create({
            data: {
                name: body.name,
                description: body.description || null,
                voiceId: body.conversation_config.tts.voice_id,
                agentId: elevenLabsData.agent_id,
                avatar: body.avatar || null,
                createdBy: parseInt(session.user.id),
            },
        });

        return NextResponse.json({
            success: true,
            agentID: elevenLabsData.agent_id,
            databaseId: agent.id,
            message: "Agent opprettet",
        });

    } catch (error) {
        console.error('Error:', error);
        return NextResponse.json(
            { error: 'Server feil', details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}
```

---

## Autentiseringsmønstre

### Basis autentisering
```typescript
const session = await getServerSession(config);

if (!session?.user?.id) {
    return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 });
}
```

### Rollebasert tilgangskontroll

**Kun lærere:**
```typescript
const session = await getServerSession(config);

if (!session?.user?.id || session.user.role !== "TEACHER") {
    return NextResponse.json({ error: "Kun lærere" }, { status: 403 });
}
```

**Lærere eller administratorer:**
```typescript
const session = await getServerSession(config);

if (!session?.user?.id || !["TEACHER", "ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Ingen tilgang" }, { status: 403 });
}
```

**Alle autentiserte brukere:**
```typescript
const session = await getServerSession(config);

if (!session?.user?.id) {
    return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 });
}

// Alle roller har tilgang her
```

### Åpen rute (ingen autentisering)
```typescript
export async function GET(req: NextRequest) {
    // Ingen autentisering nødvendig
    // Fortsett direkte med logikk
}
```

---

## ElevenLabs API-integrasjon

### Base URL og autentisering
```typescript
const API_BASE_URL = 'https://api.eu.residency.elevenlabs.io/v1/convai';
const API_KEY = process.env.ELEVENLABS_API_KEY;

const headers = {
    'xi-api-key': API_KEY!,
    'Content-Type': 'application/json',
};
```

### Vanlige endpoints

#### 1. Opprett agent
```typescript
const response = await fetch(`${API_BASE_URL}/agents/create`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
        conversation_config: {
            tts: {
                model_id: "eleven_turbo_v2_5",
                voice_id: "CMVyxPycEkgLpEF85ShA"
            },
            agent: {
                first_message: "Hei!",
                language: "no",
                prompt: {
                    prompt: "Du er en hjelpsom assistent..."
                },
                llm: {
                    model: "turbo_v2_5"
                }
            }
        },
        name: "Min Agent",
        tags: ["test", "norsk"]
    }),
});
```

#### 2. Hent agent detaljer
```typescript
const response = await fetch(`${API_BASE_URL}/agents/${agent_id}`, {
    method: 'GET',
    headers,
});
```

#### 3. Oppdater agent
```typescript
const response = await fetch(`${API_BASE_URL}/agents/${agent_id}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({
        conversation_config: {
            // Oppdatert konfigurasjon
        }
    }),
});
```

#### 4. Slett agent
```typescript
const response = await fetch(`${API_BASE_URL}/agents/${agent_id}`, {
    method: 'DELETE',
    headers,
});
```

#### 5. List alle agenter
```typescript
const response = await fetch(`${API_BASE_URL}/agents`, {
    method: 'GET',
    headers,
});
```

#### 6. Hent WebSocket URL for samtale
```typescript
const response = await fetch(
    `${API_BASE_URL}/conversation/get-signed-url?agent_id=${agent_id}`,
    {
        method: 'GET',
        headers,
    }
);

const { signedUrl } = await response.json();
// signedUrl er en wss:// URL for WebSocket tilkobling
```

### Feilhåndtering for ElevenLabs API
```typescript
const response = await fetch(`${API_BASE_URL}/agents/create`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
});

if (!response.ok) {
    const errorText = await response.text();
    console.error('ElevenLabs API error:', errorText);

    // Parse feilmelding hvis mulig
    try {
        const errorJson = JSON.parse(errorText);
        return NextResponse.json(
            { error: 'ElevenLabs API feil', details: errorJson },
            { status: response.status }
        );
    } catch {
        return NextResponse.json(
            { error: 'ElevenLabs API feil', details: errorText },
            { status: response.status }
        );
    }
}

const data = await response.json();
```

---

## Database-integrasjon

### Prisma Client Setup
Opprett `src/lib/prisma.ts`:

```typescript
import { PrismaClient } from "../../generated/prisma";

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
}
```

### Database Schema
`prisma/schema.prisma`:

```prisma
model User {
  id                Int     @id @default(autoincrement())
  email             String  @unique
  name              String?
  role              Role

  accounts          Account[]
  sessions          Session[]
  createdAgents     Agent[]
  assignments       StudentAgentAssignment[]

  @@index([email])
}

model Agent {
  id          String   @id @default(cuid())
  name        String
  description String?
  voiceId     String
  agentId     String   @unique
  avatar      String?
  createdBy   Int
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  teacher     User     @relation(fields: [createdBy], references: [id], onDelete: Cascade)
  assignments StudentAgentAssignment[]

  @@index([createdBy])
}

model StudentAgentAssignment {
  id         Int      @id @default(autoincrement())
  studentId  Int
  agentId    String
  assignedAt DateTime @default(now())

  student    User     @relation(fields: [studentId], references: [id], onDelete: Cascade)
  agent      Agent    @relation(fields: [agentId], references: [id], onDelete: Cascade)

  @@unique([studentId, agentId])
  @@index([studentId])
  @@index([agentId])
}

enum Role {
  STUDENT
  TEACHER
  ADMIN
}
```

### Vanlige database operasjoner

#### Opprett agent
```typescript
const agent = await prisma.agent.create({
    data: {
        name: "Min Agent",
        description: "En hjelpsom agent",
        voiceId: "voice_123",
        agentId: "agent_123",
        avatar: "/avatars/agent.png",
        createdBy: parseInt(session.user.id),
    },
});
```

#### Hent agent
```typescript
const agent = await prisma.agent.findUnique({
    where: { agentId: "agent_123" },
});

// Eller med relasjoner
const agent = await prisma.agent.findUnique({
    where: { agentId: "agent_123" },
    include: {
        teacher: true,
        assignments: {
            include: {
                student: true,
            },
        },
    },
});
```

#### Oppdater agent
```typescript
const agent = await prisma.agent.update({
    where: { agentId: "agent_123" },
    data: {
        name: "Oppdatert navn",
        description: "Ny beskrivelse",
    },
});
```

#### Slett agent
```typescript
await prisma.agent.delete({
    where: { agentId: "agent_123" },
});
```

#### List agenter
```typescript
// Alle agenter
const agents = await prisma.agent.findMany();

// Agenter opprettet av en lærer
const teacherAgents = await prisma.agent.findMany({
    where: { createdBy: parseInt(session.user.id) },
    orderBy: { createdAt: 'desc' },
});
```

#### Tildel agent til student
```typescript
// Opprett tildeling
const assignment = await prisma.studentAgentAssignment.create({
    data: {
        studentId: 123,
        agentId: "agent_123",
    },
});

// Eller bruk upsert for å unngå duplikater
const assignment = await prisma.studentAgentAssignment.upsert({
    where: {
        studentId_agentId: {
            studentId: 123,
            agentId: "agent_123",
        },
    },
    create: {
        studentId: 123,
        agentId: "agent_123",
    },
    update: {},
});
```

#### Fjern tildeling
```typescript
await prisma.studentAgentAssignment.deleteMany({
    where: {
        studentId: 123,
        agentId: "agent_123",
    },
});
```

#### Hent studentens agenter
```typescript
const assignments = await prisma.studentAgentAssignment.findMany({
    where: {
        studentId: parseInt(session.user.id),
    },
    include: {
        agent: true,
    },
    orderBy: {
        assignedAt: 'desc',
    },
});

// Ekstrahér kun agent data
const agents = assignments.map(a => a.agent);
```

---

## Feilhåndtering

### Generelt mønster
```typescript
export async function POST(req: NextRequest) {
    try {
        // Din logikk her

    } catch (error) {
        console.error('Error in API route:', error);

        return NextResponse.json(
            {
                error: 'En feil oppstod',
                details: error instanceof Error ? error.message : String(error)
            },
            { status: 500 }
        );
    }
}
```

### Spesifikke feiltyper

#### Valideringsfeil
```typescript
const body = await req.json();

if (!body.name || !body.voiceId) {
    return NextResponse.json(
        { error: "Påkrevde felter mangler", missing: ['name', 'voiceId'] },
        { status: 400 }
    );
}
```

#### Ikke funnet
```typescript
const agent = await prisma.agent.findUnique({
    where: { agentId: agent_id },
});

if (!agent) {
    return NextResponse.json(
        { error: "Agent ikke funnet" },
        { status: 404 }
    );
}
```

#### Autentiseringsfeil
```typescript
const session = await getServerSession(config);

if (!session?.user?.id) {
    return NextResponse.json(
        { error: "Ikke autentisert" },
        { status: 401 }
    );
}

if (session.user.role !== "TEACHER") {
    return NextResponse.json(
        { error: "Ingen tilgang - kun lærere" },
        { status: 403 }
    );
}
```

#### Database feil
```typescript
try {
    const agent = await prisma.agent.create({
        data: { /* ... */ },
    });
} catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
            return NextResponse.json(
                { error: "Agent eksisterer allerede" },
                { status: 409 }
            );
        }
    }
    throw error; // La generell feilhåndtering ta seg av resten
}
```

---

## Komplette Eksempler

### Eksempel 1: Opprett og lagre agent
`src/app/api/agents/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import config from "@/auth.config";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
    try {
        // Autentisering
        const session = await getServerSession(config);

        if (!session?.user?.id || session.user.role !== "TEACHER") {
            return NextResponse.json(
                { error: "Unauthorized - kun lærere" },
                { status: 401 }
            );
        }

        // Parse body
        const body = await req.json();
        const { conversation_config, name, description, tags, avatar } = body;

        // Validering
        if (!conversation_config || !name) {
            return NextResponse.json(
                { error: "conversation_config og name er påkrevd" },
                { status: 400 }
            );
        }

        // Sjekk API key
        const API_KEY = process.env.ELEVENLABS_API_KEY;
        if (!API_KEY) {
            return NextResponse.json(
                { error: "ElevenLabs API key ikke konfigurert" },
                { status: 500 }
            );
        }

        // Kall ElevenLabs API
        const response = await fetch(
            'https://api.eu.residency.elevenlabs.io/v1/convai/agents/create',
            {
                method: 'POST',
                headers: {
                    'xi-api-key': API_KEY,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    conversation_config,
                    name,
                    tags: tags || [],
                }),
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error('ElevenLabs API error:', errorText);
            return NextResponse.json(
                { error: 'Feil ved opprettelse av agent i ElevenLabs', details: errorText },
                { status: response.status }
            );
        }

        const elevenLabsData = await response.json();

        // Lagre i database
        const agent = await prisma.agent.create({
            data: {
                name,
                description: description || null,
                voiceId: conversation_config.tts.voice_id,
                agentId: elevenLabsData.agent_id,
                avatar: avatar || null,
                createdBy: parseInt(session.user.id),
            },
        });

        return NextResponse.json({
            success: true,
            agentID: elevenLabsData.agent_id,
            databaseId: agent.id,
            message: "Agent opprettet",
        });

    } catch (error) {
        console.error('Error creating agent:', error);
        return NextResponse.json(
            {
                error: 'Server feil',
                details: error instanceof Error ? error.message : String(error)
            },
            { status: 500 }
        );
    }
}
```

### Eksempel 2: Hent agent med dynamisk rute
`src/app/api/agents/[agent_id]/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ agent_id: string }> }
) {
    try {
        // I Next.js 15 er params en Promise
        const { agent_id } = await params;

        // Sjekk API key
        const API_KEY = process.env.ELEVENLABS_API_KEY;
        if (!API_KEY) {
            return NextResponse.json(
                { error: "ElevenLabs API key ikke konfigurert" },
                { status: 500 }
            );
        }

        // Kall ElevenLabs API
        const response = await fetch(
            `https://api.eu.residency.elevenlabs.io/v1/convai/agents/${agent_id}`,
            {
                method: 'GET',
                headers: {
                    'xi-api-key': API_KEY,
                    'Content-Type': 'application/json',
                },
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error('ElevenLabs API error:', errorText);
            return NextResponse.json(
                { error: 'Feil ved henting av agent', details: errorText },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);

    } catch (error) {
        console.error('Error fetching agent:', error);
        return NextResponse.json(
            {
                error: 'Server feil',
                details: error instanceof Error ? error.message : String(error)
            },
            { status: 500 }
        );
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ agent_id: string }> }
) {
    try {
        const { agent_id } = await params;

        const API_KEY = process.env.ELEVENLABS_API_KEY;
        if (!API_KEY) {
            return NextResponse.json(
                { error: "ElevenLabs API key ikke konfigurert" },
                { status: 500 }
            );
        }

        // Slett fra ElevenLabs
        const response = await fetch(
            `https://api.eu.residency.elevenlabs.io/v1/convai/agents/${agent_id}`,
            {
                method: 'DELETE',
                headers: {
                    'xi-api-key': API_KEY,
                },
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error('ElevenLabs API error:', errorText);
            return NextResponse.json(
                { error: 'Feil ved sletting av agent', details: errorText },
                { status: response.status }
            );
        }

        return NextResponse.json({
            success: true,
            message: "Agent slettet",
        });

    } catch (error) {
        console.error('Error deleting agent:', error);
        return NextResponse.json(
            {
                error: 'Server feil',
                details: error instanceof Error ? error.message : String(error)
            },
            { status: 500 }
        );
    }
}
```

### Eksempel 3: Hent WebSocket URL
`src/app/api/get-signed-url/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    try {
        // Hent agent_id fra query params
        const agent_id = req.nextUrl.searchParams.get("agent_id");

        if (!agent_id) {
            return NextResponse.json(
                { error: "agent_id query parameter er påkrevd" },
                { status: 400 }
            );
        }

        // Sjekk API key
        const API_KEY = process.env.ELEVENLABS_API_KEY;
        if (!API_KEY) {
            return NextResponse.json(
                { error: "ElevenLabs API key ikke konfigurert" },
                { status: 500 }
            );
        }

        // Kall ElevenLabs API for WebSocket URL
        const response = await fetch(
            `https://api.eu.residency.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${agent_id}`,
            {
                method: 'GET',
                headers: {
                    'xi-api-key': API_KEY,
                },
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error('ElevenLabs API error:', errorText);
            return NextResponse.json(
                { error: 'Feil ved henting av signed URL', details: errorText },
                { status: response.status }
            );
        }

        const data = await response.json();

        return NextResponse.json({
            signedUrl: data.signed_url,
        });

    } catch (error) {
        console.error('Error getting signed URL:', error);
        return NextResponse.json(
            {
                error: 'Server feil',
                details: error instanceof Error ? error.message : String(error)
            },
            { status: 500 }
        );
    }
}
```

### Eksempel 4: Tildel agent til student
`src/app/api/assign-agent/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import config from "@/auth.config";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
    try {
        // Autentisering - kun lærere og admins
        const session = await getServerSession(config);

        if (!session?.user?.id || !["TEACHER", "ADMIN"].includes(session.user.role)) {
            return NextResponse.json(
                { error: "Unauthorized - kun lærere og admins" },
                { status: 401 }
            );
        }

        // Parse body
        const body = await req.json();
        const { studentId, agentId, assign, agentName } = body;

        // Validering
        if (!studentId || !agentId) {
            return NextResponse.json(
                { error: "studentId og agentId er påkrevd" },
                { status: 400 }
            );
        }

        // Finn eller opprett agent i database
        let agent = await prisma.agent.findUnique({
            where: { agentId },
        });

        if (!agent) {
            // Opprett agent hvis den ikke eksisterer
            agent = await prisma.agent.create({
                data: {
                    agentId,
                    name: agentName || "Ukjent Agent",
                    voiceId: "default",
                    createdBy: parseInt(session.user.id),
                },
            });
        }

        if (assign) {
            // Tildel agent til student
            await prisma.studentAgentAssignment.upsert({
                where: {
                    studentId_agentId: {
                        studentId: parseInt(studentId),
                        agentId: agent.id,
                    },
                },
                create: {
                    studentId: parseInt(studentId),
                    agentId: agent.id,
                },
                update: {},
            });

            return NextResponse.json({
                success: true,
                message: "Agent tildelt til student",
            });
        } else {
            // Fjern tildeling
            await prisma.studentAgentAssignment.deleteMany({
                where: {
                    studentId: parseInt(studentId),
                    agentId: agent.id,
                },
            });

            return NextResponse.json({
                success: true,
                message: "Agent tildeling fjernet",
            });
        }

    } catch (error) {
        console.error('Error assigning agent:', error);
        return NextResponse.json(
            {
                error: 'Server feil',
                details: error instanceof Error ? error.message : String(error)
            },
            { status: 500 }
        );
    }
}
```

### Eksempel 5: Hent studentens agenter
`src/app/api/student-agents/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import config from "@/auth.config";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
    try {
        // Autentisering - alle autentiserte brukere
        const session = await getServerSession(config);

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: "Ikke autentisert" },
                { status: 401 }
            );
        }

        // Hent studentens tildelinger med agent info
        const assignments = await prisma.studentAgentAssignment.findMany({
            where: {
                studentId: parseInt(session.user.id),
            },
            include: {
                agent: {
                    select: {
                        id: true,
                        name: true,
                        agentId: true,
                        description: true,
                        avatar: true,
                        voiceId: true,
                    },
                },
            },
            orderBy: {
                assignedAt: 'desc',
            },
        });

        return NextResponse.json({
            success: true,
            assignments,
        });

    } catch (error) {
        console.error('Error fetching student agents:', error);
        return NextResponse.json(
            {
                error: 'Server feil',
                details: error instanceof Error ? error.message : String(error)
            },
            { status: 500 }
        );
    }
}
```

---

## Testing av API-ruter

### Med curl

#### Opprett agent
```bash
curl -X POST http://localhost:3000/api/agents \
  -H "Content-Type: application/json" \
  -d '{
    "conversation_config": {
      "tts": {
        "model_id": "eleven_turbo_v2_5",
        "voice_id": "CMVyxPycEkgLpEF85ShA"
      },
      "agent": {
        "first_message": "Hei!",
        "language": "no",
        "prompt": {
          "prompt": "Du er en hjelpsom assistent"
        },
        "llm": {
          "model": "turbo_v2_5"
        }
      }
    },
    "name": "Test Agent",
    "description": "En test agent",
    "tags": ["test"]
  }'
```

#### Hent agent
```bash
curl http://localhost:3000/api/agents/agent_123
```

#### Hent WebSocket URL
```bash
curl "http://localhost:3000/api/get-signed-url?agent_id=agent_123"
```

### Med Postman eller Thunder Client
1. Importer endepunktene
2. Legg til Content-Type: application/json header
3. Test hver rute individuelt

---

## Vanlige feil og løsninger

### Problem: "API key ikke konfigurert"
**Løsning:** Sjekk at `ELEVENLABS_API_KEY` er satt i `.env.local`

### Problem: "Unauthorized"
**Løsning:** Sjekk at NextAuth session fungerer og at brukeren har riktig rolle

### Problem: "Agent ikke funnet" i database
**Løsning:** Sjekk at agent er opprettet i både ElevenLabs og database

### Problem: WebSocket tilkobling feiler
**Løsning:** Sjekk at signed URL er hentet korrekt og ikke utløpt

### Problem: CORS feil
**Løsning:** API-ruter i Next.js App Router håndterer CORS automatisk, men sjekk at kall kommer fra samme domene

---

## Best Practices

1. **Alltid valider input** - Sjekk at påkrevde felter eksisterer før API-kall
2. **Bruk try-catch** - Håndter feil gracefully
3. **Log feil** - Bruk `console.error()` for debugging
4. **Sjekk autentisering** - Beskyt sensitive ruter
5. **Bruk TypeScript** - Få typesikkerhet i API-rutene
6. **Test grundig** - Test både suksess og feilscenarier
7. **Dokumenter API** - Skriv kommentarer og dokumentasjon
8. **Versjonering** - Vurder å versjonere API-ruter (`/api/v1/...`)

---

## Videre lesning

- [Next.js API Routes dokumentasjon](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [NextAuth.js dokumentasjon](https://next-auth.js.org/)
- [Prisma dokumentasjon](https://www.prisma.io/docs/)
- [ElevenLabs API dokumentasjon](https://elevenlabs.io/docs/api-reference/conversational-ai)

---

**Opprettet:** 2026-01-27
**Prosjekt:** inf219 Agent Management System
