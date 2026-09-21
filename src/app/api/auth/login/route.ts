import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import connectToDatabase from "@/lib/db";
import User from "@/models/User";
import { createToken } from "@/lib/jwt";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { identifier, email, password } = body;

    // Accepts either `identifier` (ID or email) or `email`
    const userIdentifier = (identifier || email || "").trim();

    if (!userIdentifier || !password) {
      return NextResponse.json(
        { error: "Please provide both ID/Email and Password" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Query user by email (or _id if valid MongoDB ObjectId)
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(userIdentifier);
    const query = isObjectId
      ? { $or: [{ _id: userIdentifier }, { email: userIdentifier.toLowerCase() }] }
      : { email: userIdentifier.toLowerCase() };

    // Select password since it has select: false in schema
    const user = await User.findOne(query).select("+password");

    if (!user || !user.password) {
      return NextResponse.json(
        { error: "Invalid ID/Email or Password" },
        { status: 401 }
      );
    }

    if (user.isActive === false) {
      return NextResponse.json(
        { error: "Account is disabled. Please contact administrator." },
        { status: 403 }
      );
    }

    // Compare hashed password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return NextResponse.json(
        { error: "Invalid ID/Email or Password" },
        { status: 401 }
      );
    }

    // Generate JWT token
    const token = createToken({
      userId: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
    });

    // Create JSON response
    const response = NextResponse.json(
      {
        success: true,
        message: "Login successful",
        user: {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          role: user.role,
          schoolId: user.schoolId ? user.schoolId.toString() : null,
          mustChangePassword: !!user.mustChangePassword,
        },
        token,
      },
      { status: 200 }
    );

    // Set HTTP-only cookie
    response.cookies.set("erp_auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error: unknown) {
    console.error("Login error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to log in";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
