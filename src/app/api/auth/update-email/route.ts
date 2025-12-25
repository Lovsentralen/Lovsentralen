import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Ikke autorisert" }, { status: 401 });
    }

    const body = await request.json();
    const { email } = body as { email: string };

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "Ugyldig e-postadresse" },
        { status: 400 }
      );
    }

    // Update email - Supabase will send a confirmation email to the new address
    const { error } = await supabase.auth.updateUser({
      email: email,
    });

    if (error) {
      console.error("Error updating email:", error);
      return NextResponse.json(
        { error: error.message || "Kunne ikke oppdatere e-post" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "En bekreftelseslenke er sendt til din nye e-postadresse",
    });
  } catch (error) {
    console.error("Error in update-email:", error);
    return NextResponse.json(
      { error: "En feil oppstod" },
      { status: 500 }
    );
  }
}

