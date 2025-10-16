import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('[Mock API] /ai/nutrition received:', body);

    // Return mock nutrition plan
    const mockNutrition = {
      daily: {
        calories: 2200,
        protein: 165,
        carbs: 220,
        fat: 73,
        fiber: 30,
        water: 3
      },
      meals: [
        {
          name: "ארוחת בוקר",
          time: "07:00",
          calories: 550,
          items: [
            "2 ביצים מקושקשות",
            "2 פרוסות לחם מלא",
            "חצי אבוקדו",
            "כוס ירקות חתוכים"
          ]
        },
        {
          name: "ארוחת צהריים",
          time: "13:00",
          calories: 660,
          items: [
            "150 גרם חזה עוף",
            "כוס אורז מלא",
            "סלט ירקות גדול",
            "כף שמן זית"
          ]
        },
        {
          name: "ארוחת ערב",
          time: "19:00",
          calories: 550,
          items: [
            "150 גרם דג",
            "200 גרם בטטה",
            "ירקות מאודים"
          ]
        },
        {
          name: "חטיף",
          time: "16:00",
          calories: 220,
          items: [
            "כוס יוגורט",
            "חופן אגוזים",
            "פרי"
          ]
        },
        {
          name: "לאחר אימון",
          time: "21:00",
          calories: 220,
          items: [
            "אבקת חלבון",
            "בננה"
          ]
        }
      ],
      supplements: [
        "ויטמין D - 1000 יחידות ביום",
        "אומגה 3 - 1 גרם ביום",
        "מגנזיום - 400 מ\"ג לפני השינה"
      ],
      guidelines: [
        "שתו לפחות 3 ליטר מים ביום",
        "אכלו ירקות בכל ארוחה",
        "הימנעו ממזון מעובד",
        "תכננו ארוחות מראש"
      ]
    };

    return NextResponse.json({
      ok: true,
      json: mockNutrition
    });
  } catch (error) {
    console.error('[Mock API] /ai/nutrition error:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to generate nutrition plan' },
      { status: 500 }
    );
  }
}