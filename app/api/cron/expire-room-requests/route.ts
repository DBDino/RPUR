import { timingSafeEqual } from "node:crypto";
import { expireRoomRequests } from "@/lib/room-request-expiration";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return Response.json({ error: "CRON_SECRET belum dikonfigurasi." }, { status: 503 });

  const supplied = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
    return Response.json({ error: "Tidak terautentikasi." }, { status: 401 });
  }

  const result = await expireRoomRequests();
  return Response.json(result);
}
