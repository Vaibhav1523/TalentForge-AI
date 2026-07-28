import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";

interface CalAttendee {
  name: string;
  email: string;
  timeZone?: string;
}

interface CalResponses {
  [key: string]: { value: string | string[] };
}

interface CalWebhookPayload {
  triggerEvent: string;
  payload: {
    uid: string;
    startTime: string;
    status: string;
    attendees?: CalAttendee[];
    responses?: CalResponses;
  };
}

function verifySignature(rawBody: string, signature: string): boolean {
  const secret = process.env.CAL_WEBHOOK_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[/api/webhooks/cal] CAL_WEBHOOK_SECRET is not set — all requests are allowed in non-production");
      return true;
    }
    console.error("[/api/webhooks/cal] CAL_WEBHOOK_SECRET is not set — rejecting request in production");
    return false;
  }

  const expectedHex = createHmac("sha256", secret).update(rawBody).digest("hex");
  // Strip optional "sha256=" prefix from the incoming header value
  const incomingHex = signature.replace(/^sha256=/, "");

  // Reject immediately if lengths differ to avoid padding attacks
  if (expectedHex.length !== incomingHex.length) return false;

  return timingSafeEqual(Buffer.from(expectedHex), Buffer.from(incomingHex));
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-cal-signature-256") ?? "";

    if (!verifySignature(rawBody, signature)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: CalWebhookPayload;
    let triggerEvent: string;
    let payload: CalWebhookPayload["payload"];
    try {
      body = JSON.parse(rawBody) as CalWebhookPayload;
      ({ triggerEvent, payload } = body);
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    if (triggerEvent === "BOOKING_CREATED") {
      const attendee = payload.attendees?.[0];

      // Ping test from Cal.com has no attendees — just acknowledge
      if (!attendee) return NextResponse.json({ ok: true });

      const scheduledAt = new Date(payload.startTime);
      if (isNaN(scheduledAt.getTime())) {
        console.error("[/api/webhooks/cal] BOOKING_CREATED: invalid startTime:", payload.startTime);
        return NextResponse.json({ error: "Invalid startTime" }, { status: 400 });
      }

      // Idempotency check - prevent duplicate bookings on webhook retry
      const existingBooking = await prisma.booking.findFirst({
        where: { calBookingUid: payload.uid },
      });
      if (existingBooking) {
        return NextResponse.json({ ok: true });
      }

      try {
        await prisma.$transaction(async (tx) => {
          // Find the most recent Lead by email that has no active (non-cancelled) booking
          let lead = await tx.lead.findFirst({
            where: {
              email: attendee.email,
              booking: { none: { status: { not: "CANCELLED" } } },
            },
            orderBy: { createdAt: "desc" },
          });

          // If no lead exists (booked directly on Cal.com), create one automatically
          if (!lead) {
            lead = await tx.lead.create({
              data: {
                name: attendee.name,
                email: attendee.email,
                company: "—",
              },
            });
          }

          await tx.booking.create({
            data: {
              leadId: lead.id,
              scheduledAt,
              calBookingUid: payload.uid,
              status: "CONFIRMED",
            },
          });
        });
      } catch (err) {
        // A concurrent webhook delivery already created this booking — treat as idempotent
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
          return NextResponse.json({ ok: true });
        }
        throw err;
      }
    }

    if (triggerEvent === "BOOKING_CANCELLED") {
      await prisma.booking.updateMany({
        where: { calBookingUid: payload.uid },
        data: { status: "CANCELLED" },
      });
    }

    if (triggerEvent === "BOOKING_RESCHEDULED") {
      const scheduledAt = new Date(payload.startTime);
      if (isNaN(scheduledAt.getTime())) {
        console.error("[/api/webhooks/cal] BOOKING_RESCHEDULED: invalid startTime:", payload.startTime);
        return NextResponse.json({ error: "Invalid startTime" }, { status: 400 });
      }
      await prisma.booking.updateMany({
        where: { calBookingUid: payload.uid },
        data: { scheduledAt },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[/api/webhooks/cal] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
