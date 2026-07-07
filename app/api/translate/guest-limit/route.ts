import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    allowed: true,
    remaining: 999999,
    used: 0,
    limit: 999999,
  })
}

export async function POST() {
  return NextResponse.json({
    allowed: true,
    remaining: 999999,
    used: 0,
    limit: 999999,
  })
}
