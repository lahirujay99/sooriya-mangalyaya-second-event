// app/api/submit/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma'; // Import the singleton instance
import { z } from 'zod'; // Using Zod for validation

// Define expected input schema using Zod - updated to focus on papaya only
const submitSchema = z.object({
  tokenCode: z.string().min(1, 'Token is required'),
  contestType: z.literal('papaya'), // Only allow papaya contest type
  fullName: z.string().min(1, 'Full Name is required'),
  nic: z.string().optional(),
  contactNumber: z.string().min(1, 'Contact Number is required'),
  guess: z.number().int().positive('Guess must be a positive number for papaya contest'),
});


export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // 1. Validate Input Data
    const validation = submitSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { message: "Invalid input", errors: validation.error.errors },
        { status: 400 }
      );
    }

    const { tokenCode, fullName, nic, contactNumber, guess } = validation.data;

    // 2. Execute core logic within a Prisma Transaction
    const result = await prisma.$transaction(async (tx) => {
      // a. Find the token (use findUniqueOrThrow for cleaner error handling if not found)
      const token = await tx.token.findUnique({
        where: { token_code: tokenCode },
      });

      // b. Validate token status INSIDE the transaction
      if (!token) {
        throw new Error('INVALID_TOKEN'); // Custom error type
      }
      if (!token.is_valid) {
         throw new Error('TOKEN_NOT_VALID');
      }
      if (token.is_used) {
        throw new Error('TOKEN_ALREADY_USED');
      }

      // c. Create the response record
      const response = await tx.response.create({
        data: {
          contest_type: 'papaya', // Always papaya now
          full_name: fullName,
          nic: nic, // Will be null if undefined
          contact_number: contactNumber,
          papaya_seed_guess: guess,
          token_id: token.id, // Link to the token using its ID
          submitted_at: new Date(),
        },
      });

      // d. Mark the token as used and link the response ID
      await tx.token.update({
        where: { id: token.id },
        data: {
          is_used: true,
          used_at: new Date(),
        },
      });

      // The transaction automatically commits here if no errors were thrown
      return { responseId: response.id };
    }); // End of Prisma Transaction

    // 3. Return Success Response
    return NextResponse.json(
      { message: "Submission successful!", responseId: result.responseId },
      { status: 200 }
    );

  } catch (error: Error | unknown) {
    console.error("Submission Error:", error); // Log the detailed error server-side

    // 4. Handle Specific Errors (e.g., those thrown from the transaction)
    if (error instanceof Error) {
      if (error.message === 'INVALID_TOKEN') {
          return NextResponse.json({ message: "Invalid token provided." }, { status: 400 });
      }
      if (error.message === 'TOKEN_NOT_VALID') {
          return NextResponse.json({ message: "This token is not valid for the contest." }, { status: 400 });
      }
      if (error.message === 'TOKEN_ALREADY_USED') {
          return NextResponse.json({ message: "This token has already been used." }, { status: 409 }); // 409 Conflict is suitable
      }
    }
    
    // Handle potential Prisma errors (e.g., unique constraint violations if the logic has a flaw)
    const prismaError = error as { code?: string };
    if (prismaError.code === 'P2002') { // Prisma unique constraint violation code
        return NextResponse.json({ message: "Error processing submission (duplicate)." }, { status: 409 });
    }

    // Generic Server Error
    return NextResponse.json(
      { message: "An error occurred during submission." },
      { status: 500 }
    );
  }
}