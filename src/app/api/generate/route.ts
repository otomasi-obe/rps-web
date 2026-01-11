import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { 
  SYSTEM_PROMPT, 
  generateFullRPSPrompt,
  generateCourseDescriptionPrompt,
  generateCPLPrompt,
  generateCPMKPrompt,
  generateWeeklyPlanPrompt 
} from '@/lib/prompts';
import { CourseIdentity, Institution } from '@/types/rps';

// Initialize OpenAI client
const getOpenAIClient = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
  }
  return new OpenAI({ apiKey });
};

interface GenerateRequest {
  type: 'full' | 'description' | 'cpl' | 'cpmk' | 'weeklyPlan';
  identity: CourseIdentity;
  institution: Institution;
  jenisMK?: 'teori' | 'praktikum' | 'campuran';
  additionalContext?: string;
  // For partial generation
  deskripsiSingkat?: string;
  cplList?: { kode: string; pernyataan: string }[];
  cpmkList?: { kode: string; pernyataan: string }[];
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateRequest = await request.json();
    const { type, identity, institution, jenisMK = 'campuran', additionalContext } = body;

    // Validate required fields
    if (!identity?.nama) {
      return NextResponse.json(
        { error: 'Nama mata kuliah harus diisi' },
        { status: 400 }
      );
    }

    const openai = getOpenAIClient();

    // Build prompt based on generation type
    let userPrompt: string;
    switch (type) {
      case 'description':
        userPrompt = generateCourseDescriptionPrompt(identity, institution, additionalContext);
        break;
      case 'cpl':
        userPrompt = generateCPLPrompt(identity, institution, jenisMK);
        break;
      case 'cpmk':
        if (!body.cplList || !body.deskripsiSingkat) {
          return NextResponse.json(
            { error: 'CPL dan deskripsi harus ada untuk generate CPMK' },
            { status: 400 }
          );
        }
        userPrompt = generateCPMKPrompt(identity, body.cplList, body.deskripsiSingkat);
        break;
      case 'weeklyPlan':
        if (!body.cpmkList || !body.deskripsiSingkat) {
          return NextResponse.json(
            { error: 'CPMK dan deskripsi harus ada untuk generate rencana mingguan' },
            { status: 400 }
          );
        }
        userPrompt = generateWeeklyPlanPrompt(identity, body.deskripsiSingkat, body.cpmkList, jenisMK);
        break;
      case 'full':
      default:
        userPrompt = generateFullRPSPrompt(identity, institution, jenisMK, additionalContext);
        break;
    }

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Cost-effective model
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 4000,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Empty response from OpenAI');
    }

    // Parse JSON response
    const result = JSON.parse(content);

    return NextResponse.json({
      success: true,
      data: result,
      usage: completion.usage,
    });

  } catch (error) {
    console.error('OpenAI API Error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('OPENAI_API_KEY')) {
        return NextResponse.json(
          { error: 'API Key belum dikonfigurasi. Silakan set OPENAI_API_KEY di environment.' },
          { status: 500 }
        );
      }
      return NextResponse.json(
        { error: `Error: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Terjadi kesalahan saat generate konten' },
      { status: 500 }
    );
  }
}
