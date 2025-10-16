import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('[Mock API] /ai/workout received:', body);

    // Return mock workout plan
    const mockWorkout = {
      weeks: [
        {
          week: 1,
          days: [
            {
              day: 1,
              name: "חזה ותלת ראשי",
              exercises: [
                { name: "לחיצת חזה", sets: 3, reps: "10-12", rest: "60 שניות" },
                { name: "לחיצת כתפיים", sets: 3, reps: "10-12", rest: "60 שניות" },
                { name: "מקבילים", sets: 3, reps: "8-10", rest: "90 שניות" }
              ]
            },
            {
              day: 2,
              name: "גב ודו ראשי",
              exercises: [
                { name: "מתח", sets: 3, reps: "8-10", rest: "90 שניות" },
                { name: "חתירה בכבל", sets: 3, reps: "10-12", rest: "60 שניות" },
                { name: "כפיפות מרפק", sets: 3, reps: "10-12", rest: "60 שניות" }
              ]
            },
            {
              day: 3,
              name: "רגליים",
              exercises: [
                { name: "סקוואט", sets: 3, reps: "10-12", rest: "90 שניות" },
                { name: "מכונת רגליים", sets: 3, reps: "12-15", rest: "60 שניות" },
                { name: "עליות על בהונות", sets: 3, reps: "15-20", rest: "45 שניות" }
              ]
            }
          ]
        }
      ]
    };

    return NextResponse.json({
      ok: true,
      plan: mockWorkout,
      warnings: []
    });
  } catch (error) {
    console.error('[Mock API] /ai/workout error:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to generate workout plan' },
      { status: 500 }
    );
  }
}