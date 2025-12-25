import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Ikke autorisert" }, { status: 401 });
    }

    // Delete the case (cascades to related tables)
    const { error } = await supabase
      .from("cases")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      console.error("Error deleting case:", error);
      return NextResponse.json(
        { error: "Kunne ikke slette sak" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/cases/[id]:", error);
    return NextResponse.json(
      { error: "En uventet feil oppsto" },
      { status: 500 },
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Ikke autorisert" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("cases")
      .select(
        `
        *,
        clarifications (*),
        results (*),
        evidence (*)
      `,
      )
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (error) {
      console.error("Error fetching case:", error);
      return NextResponse.json({ error: "Sak ikke funnet" }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Error in GET /api/cases/[id]:", error);
    return NextResponse.json(
      { error: "En uventet feil oppsto" },
      { status: 500 },
    );
  }
}
