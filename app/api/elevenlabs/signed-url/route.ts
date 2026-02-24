import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()

        // Verify user is authenticated
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { agentId } = await request.json()

        if (!agentId) {
            return NextResponse.json({ error: 'Agent ID required' }, { status: 400 })
        }

        // Get user's profile and role
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        // Verify user has access to this agent
        // Teachers can access their own agents, students need access via student_access
        if (profile?.role === 'teacher') {
            const { data: assistant } = await supabase
                .from('assistants')
                .select('id')
                .eq('elevenlabs_agent_id', agentId)
                .eq('teacher_id', user.id)
                .single()

            if (!assistant) {
                return NextResponse.json({ error: 'Access denied' }, { status: 403 })
            }
        } else {
            // Student - check access via share codes OR utdanningsprogram
            let hasAccess = false

            // Check share code access
            const { data: shareAccess } = await supabase
                .from('student_access')
                .select('id, assistant:assistants(elevenlabs_agent_id)')
                .eq('student_id', user.id)
                .gt('expires_at', new Date().toISOString())

            hasAccess = shareAccess?.some((a) => {
                const assistant = a.assistant as unknown as { elevenlabs_agent_id: string } | null
                return assistant?.elevenlabs_agent_id === agentId
            }) ?? false

            // If no share code access, check utdanningsprogram access
            if (!hasAccess) {
                const { data: userPrograms } = await supabase
                    .from('profile_utdanningsprogram')
                    .select('utdanningsprogram_id')
                    .eq('profile_id', user.id)

                const programIds = userPrograms?.map(p => p.utdanningsprogram_id) || []

                if (programIds.length > 0) {
                    // Find the assistant by agent ID, then check if it shares a program
                    const { data: matchingAssistant } = await supabase
                        .from('assistants')
                        .select('id')
                        .eq('elevenlabs_agent_id', agentId)
                        .single()

                    if (matchingAssistant) {
                        const { data: programMatch } = await supabase
                            .from('assistant_utdanningsprogram')
                            .select('assistant_id')
                            .eq('assistant_id', matchingAssistant.id)
                            .in('utdanningsprogram_id', programIds)
                            .limit(1)

                        hasAccess = (programMatch?.length ?? 0) > 0
                    }
                }
            }

            if (!hasAccess) {
                return NextResponse.json({ error: 'Access denied' }, { status: 403 })
            }
        }

        // Generate signed URL from ElevenLabs
        const apiKey = process.env.ELEVENLABS_API_KEY

        if (!apiKey) {
            return NextResponse.json(
                { error: 'ElevenLabs API key not configured' },
                { status: 500 }
            )
        }

        const response = await fetch(
            `https://api.eu.residency.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${agentId}`,
            {
                method: 'GET',
                headers: {
                    'xi-api-key': apiKey,
                },
            }
        )

        if (!response.ok) {
            const errorText = await response.text()
            console.error('ElevenLabs API error:', errorText)
            return NextResponse.json(
                { error: 'Failed to get signed URL from ElevenLabs' },
                { status: 500 }
            )
        }

        const data = await response.json()

        return NextResponse.json({ signedUrl: data.signed_url })
    } catch (error) {
        console.error('Error generating signed URL:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
