// app/api/submit-flower/route.ts
import { NextRequest, NextResponse } from 'next/server';
// import prisma from '@/lib/prisma';
import { z } from 'zod'; 
import { PrismaClient } from '@prisma/client';

// Define expected input schema using Zod for flower contest
const submitFlowerSchema = z.object({
  tokenCode: z.string().min(1, 'Token is required'),
  contestType: z.literal('flower'), 
  fullName: z.string().min(1, 'Full Name is required'),
  nic: z.string().optional(),
  contactNumber: z.string().min(1, 'Contact Number is required'),
  flowerName: z.string().min(1, 'Flower name guess is required'),
});

// Define the expected return type from the raw query
type FlowerResponseResult = {
  id: string;
}

// Create a fresh client instance for this request
const localPrisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // 1. Validate Input Data
    const validation = submitFlowerSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { message: "Invalid input", errors: validation.error.errors },
        { status: 400 }
      );
    }

    const { tokenCode, fullName, nic, contactNumber, flowerName } = validation.data;

    // Check if token exists and is valid
    const token = await localPrisma.token.findUnique({
      where: { token_code: tokenCode },
    });

    // Validate token status
    if (!token) {
      return NextResponse.json({ message: "Invalid token provided." }, { status: 400 });
    }
    if (!token.is_valid) {
      return NextResponse.json({ message: "This token is not valid for the contest." }, { status: 400 });
    }
    if (token.is_used) {
      return NextResponse.json({ message: "This token has already been used." }, { status: 409 });
    }

    // Create the flower response using direct query instead of model access
    const result = await localPrisma.$queryRaw<FlowerResponseResult[]>`
      INSERT INTO "FlowerResponse" (
        id, 
        contest_type, 
        full_name, 
        nic, 
        contact_number, 
        secret_flower_name, 
        token_id, 
        submitted_at
      ) VALUES (
        gen_random_uuid(), 
        'flower', 
        ${fullName}, 
        ${nic || null}, 
        ${contactNumber}, 
        ${flowerName}, 
        ${token.id}, 
        now()
      ) RETURNING id
    `;

    const responseId = result && Array.isArray(result) && result.length > 0 ? result[0].id : "unknown";

    // Mark the token as used
    await localPrisma.token.update({
      where: { id: token.id },
      data: {
        is_used: true,
        used_at: new Date(),
      },
    });

    // Disconnect the local Prisma client after use
    await localPrisma.$disconnect();

    // Return Success Response
    return NextResponse.json(
      { message: "Submission successful!", responseId },
      { status: 200 }
    );

  } catch (error: any) {
    console.error("Flower Submission Error:", error);

    // Handle potential Prisma errors
    if (error.code === 'P2002') { // Prisma unique constraint violation
      return NextResponse.json({ message: "Error processing submission (duplicate)." }, { status: 409 });
    }

    // Generic Server Error
    return NextResponse.json(
      { message: "An error occurred during submission." },
      { status: 500 }
    );
  }
}