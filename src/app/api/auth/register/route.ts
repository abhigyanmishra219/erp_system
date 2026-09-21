import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import connectToDatabase from "@/lib/db";
import User from "@/models/User";
import { createToken } from "@/lib/jwt";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, name } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user with default role: SYSTEM_ADMIN as requested
    const displayName = name || email.split("@")[0];
    const newUser = await User.create({
      email: email.toLowerCase(),
      name: displayName,
      password: hashedPassword,
      role: "SYSTEM_ADMIN",
      isActive: true,
    });

    // Create JWT Token
    const userPayload = {
      userId: newUser._id.toString(),
      email: newUser.email,
      name: newUser.name,
      role: newUser.role,
    };

    const token = createToken(userPayload);

    // Set HTTP-Only auth cookie
    const response = NextResponse.json(
      {
        success: true,
        message: "Account created successfully as System Admin",
        user: {
          id: newUser._id.toString(),
          email: newUser.email,
          name: newUser.name,
          role: newUser.role,
        },
        token,
      },
      { status: 201 }
    );

    response.cookies.set("erp_auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error: unknown) {
    console.error("Register error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to create account";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
