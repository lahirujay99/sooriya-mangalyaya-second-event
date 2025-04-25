// app/api/validate-token/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';

// Simple validation schema for token
const tokenSchema = z.object({
  tokenCode: z.string().min(1, 'Token is required')
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Validate input data
    const validation = tokenSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { message: "Invalid input", valid: false },
        { status: 400 }
      );
    }
    
    const { tokenCode } = validation.data;
    
    try {
      // Check if token exists and is valid
      const token = await prisma.token.findUnique({
        where: { token_code: tokenCode }
      });
      
      // Token doesn't exist
      if (!token) {
        return NextResponse.json(
          { message: "Invalid token provided.", valid: false },
          { status: 200 } // Using 200 status to handle in frontend
        );
      }
      
      // Token is used
      if (token.is_used) {
        return NextResponse.json(
          { message: "This token has already been used.", valid: false },
          { status: 200 }
        );
      }
      
      // Token is invalid
      if (!token.is_valid) {
        return NextResponse.json(
          { message: "This token is not valid for the contest.", valid: false },
          { status: 200 }
        );
      }
      
      // Token is valid
      return NextResponse.json(
        { message: "Token is valid", valid: true },
        { status: 200 }
      );
    } catch (dbError: any) {
      console.error("Database error:", dbError);
      
      // Check if this is a Prisma initialization error
      if (dbError.message && dbError.message.includes("Prisma Client not initialized")) {
        return NextResponse.json(
          { message: "Database connection error. Please try again later.", valid: false },
          { status: 503 } // Service Unavailable
        );
      }
      
      return NextResponse.json(
        { message: "Database error occurred", valid: false },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Token validation error:", error);
    return NextResponse.json(
      { message: "Error validating token", valid: false },
      { status: 500 }
    );
  }
}