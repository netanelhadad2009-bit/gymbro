/**
 * Notification Message Templates
 * All notification copy in Hebrew (RTL)
 * No workout-related notifications - focus on nutrition, journey, and engagement
 */

import type { NotificationData } from './send';

export interface TemplateContext {
  userName?: string;
  remaining?: number;  // Grams of protein remaining, days remaining, etc.
  target?: number;
  current?: number;
  daysSince?: number;
  streakDays?: number;
  stageName?: string;
}

/**
 * Daily Protein Target Reminder (Evening - 8pm)
 * Reminds users who haven't hit their daily protein target
 */
export function getDailyProteinTargetNotification(ctx: TemplateContext): NotificationData {
  const remaining = ctx.remaining || 0;
  const target = ctx.target || 0;
  const current = ctx.current || 0;

  const variants = [
    {
      title: `נשאר ${remaining}g חלבון 💪`,
      body: `היעד היומי: ${target}g | צריכה עד כה: ${current}g. בוא נסגור את היום!`
    },
    {
      title: 'יעד החלבון מחכה לך',
      body: `עדיין ${remaining}g עד היעד. אולי שווה להוסיף עוד מנה?`
    },
    {
      title: 'החלבון זה הדלק שלך 🔥',
      body: `נשאר ${remaining}g חלבון להיום. בוא נעמוד ביעד!`
    }
  ];

  const variant = variants[Math.floor(Math.random() * variants.length)];

  return {
    ...variant,
    route: '/nutrition',
    icon: '/icons/protein.png'
  };
}

/**
 * Midday Protein Reminder (2pm)
 * Nudges users if protein is less than 50% of target
 */
export function getMiddayProteinNotification(ctx: TemplateContext): NotificationData {
  const target = ctx.target || 0;
  const current = ctx.current || 0;
  const remaining = target - current;

  const variants = [
    {
      title: 'יעד החלבון שלך מחכה 🥚',
      body: `עדיין לא הגעת לחצי מהחלבון היומי (${current}/${target}g). אולי שווה להוסיף עוד מנה?`
    },
    {
      title: 'החלבון זה הדלק של השריר שלך',
      body: `נשאר ${remaining}g חלבון להיום. תבדוק איפה אתה עומד בתפריט שלך.`
    },
    {
      title: 'זמן למנה עם חלבון 💪',
      body: `עברת חצי יום ועדיין ${remaining}g חלבון עד היעד. בוא נתקדם!`
    }
  ];

  const variant = variants[Math.floor(Math.random() * variants.length)];

  return {
    ...variant,
    route: '/nutrition',
    icon: '/icons/protein.png'
  };
}

/**
 * Weekly Weigh-In Reminder (Friday morning - 7am)
 * Encourages consistent weekly weigh-ins
 */
export function getWeighInReminderNotification(): NotificationData {
  const variants = [
    {
      title: 'שישי היום - זמן לבדוק התקדמות ⚖️',
      body: 'תעלה על המשקל ותעדכן ב-FitJourney. נראה ביחד מה השתנה השבוע.'
    },
    {
      title: 'שקילת שישי השבועית',
      body: 'כמה התקדמת במסע שלך? עדכן משקל ונבדוק ביחד את ההתקדמות.'
    },
    {
      title: 'זמן לעמוד על המשקל ⚖️',
      body: 'שבוע נוסף עבר. בוא נראה איפה אתה עומד במסע שלך.'
    }
  ];

  const variant = variants[Math.floor(Math.random() * variants.length)];

  return {
    ...variant,
    route: '/progress?action=weigh',
    icon: '/icons/scale.png'
  };
}

/**
 * Stage Completion / New Stage Unlocked
 * Celebrates progress and drives users back to journey
 */
export function getStageCompletionNotification(ctx: TemplateContext): NotificationData {
  const stageName = ctx.stageName || 'שלב חדש';

  const variants = [
    {
      title: 'סיימת שלב במסע שלך! 🚀',
      body: `${stageName} נפתח! בוא לראות מה מחכה לך במפה.`
    },
    {
      title: 'כל הכבוד! 🎉',
      body: `השלב הנוכחי הושלם ✅ שלב חדש פתוח במפה שלך.`
    },
    {
      title: 'התקדמת במסע! 💪',
      body: 'שלב נוסף מאחוריך. בוא לראות מה הבא במפה.'
    }
  ];

  const variant = variants[Math.floor(Math.random() * variants.length)];

  return {
    ...variant,
    route: '/journey',
    icon: '/icons/trophy.png',
    data: { stageName }
  };
}

/**
 * Journey Nudge (Stuck on Stage)
 * Nudges users who haven't made progress for 2+ days
 */
export function getJourneyNudgeNotification(ctx: TemplateContext): NotificationData {
  const daysSince = ctx.daysSince || 2;

  const variants = [
    {
      title: 'המפה שלך מחכה לך ✨',
      body: 'בוא נתקדם עוד קצת בשלב הנוכחי. רק עוד צעד קטן!'
    },
    {
      title: `עברו ${daysSince} ימים מההתקדמות האחרונה`,
      body: 'לפעמים צריך רק צעד אחד קטן. חזור למפה ותמשיך את המסע שלך.'
    },
    {
      title: 'המסע שלך ממתין 🗺️',
      body: 'כל יום טוב מתחיל בצעד קטן. בוא נתקדם ביחד!'
    }
  ];

  const variant = variants[Math.floor(Math.random() * variants.length)];

  return {
    ...variant,
    route: '/journey',
    icon: '/icons/map.png'
  };
}

/**
 * Streak Celebration (Milestone Achievement)
 * Celebrates consistent behavior at milestones (3, 7, 14, 30 days)
 */
export function getStreakCelebrationNotification(ctx: TemplateContext): NotificationData {
  const days = ctx.streakDays || 3;

  // Different messages for different milestones
  if (days >= 30) {
    return {
      title: '🔥 חודש שלם ברצף! 🔥',
      body: 'אתה 30 ימים ברצף במסע שלך. זה לא עוד ניסיון - זה כבר אורח חיים חדש!',
      route: '/journey',
      icon: '/icons/fire.png',
      data: { streakDays: days }
    };
  } else if (days >= 14) {
    return {
      title: '🔥 שבועיים ברצף! 🔥',
      body: `${days} ימים עומד ביעדים שלך. ההתמדה שלך מדהימה!`,
      route: '/journey',
      icon: '/icons/fire.png',
      data: { streakDays: days }
    };
  } else if (days >= 7) {
    return {
      title: '🔥 שבוע שלם ברצף! 🔥',
      body: 'אתה 7 ימים רצוף עומד ביעדים. זה כבר לא מזל - זה אורח חיים חדש! 👊',
      route: '/journey',
      icon: '/icons/fire.png',
      data: { streakDays: days }
    };
  } else {
    // 3 days
    return {
      title: '🔥 רצף של 3 ימים! 🔥',
      body: 'אתה 3 ימים ברצף עומד ביעדים שלך. ככה בונים תוצאות!',
      route: '/journey',
      icon: '/icons/fire.png',
      data: { streakDays: days }
    };
  }
}

/**
 * Inactivity / Re-engagement
 * Brings back users who haven't been active for 3+ days
 */
export function getInactivityNotification(ctx: TemplateContext): NotificationData {
  const daysSince = ctx.daysSince || 3;

  const variants = [
    {
      title: 'התגעגענו אליך 👀',
      body: `עברו ${daysSince} ימים מאז התחברת. בוא נחזור ליום אחד טוב - זה כבר מחזיר אותך לקצב.`
    },
    {
      title: 'מתחילים שוב? 💪',
      body: 'לא צריך להיות מושלם. מספיק יום אחד טוב. בוא נחזור למסע שלך ב-FitJourney.'
    },
    {
      title: `נעדרת כבר ${daysSince} ימים...`,
      body: 'כל התחלה חדשה מתחילה בצעד אחד. בוא נחזור למסלול ביחד! 🚀'
    },
    {
      title: 'FitJourney מחכה לך',
      body: 'גם יום אחד טוב עושה הבדל. בוא נתחיל מחדש ביחד!'
    }
  ];

  const variant = variants[Math.floor(Math.random() * variants.length)];

  return {
    ...variant,
    route: '/journey',
    icon: '/icons/comeback.png',
    data: { daysSince }
  };
}

/**
 * Meal Reminder (Multiple times per day)
 * Periodic reminders to log meals throughout the day
 */
export function getMealReminderNotification(timeOfDay?: 'morning' | 'afternoon' | 'evening'): NotificationData {
  const morningVariants = [
    {
      title: 'בוקר טוב! ☀️',
      body: 'תעד את הארוחה הראשונה של היום ונתחיל את הרצף!'
    },
    {
      title: 'זמן ארוחת בוקר 🍳',
      body: 'אל תשכח לתעד את הארוחה כדי לעמוד ביעד החלבון היומי.'
    }
  ];

  const afternoonVariants = [
    {
      title: 'זמן לתעד ארוחת צהריים 🍽️',
      body: 'רוב היום עוד לפנינו - בוא נוודא שאנחנו על המסלול הנכון!'
    },
    {
      title: 'ארוחת צהריים? 🥗',
      body: 'זכור לתעד כדי לעקוב אחר היעד היומי שלך.'
    }
  ];

  const eveningVariants = [
    {
      title: 'זמן לסגור את היום 🌙',
      body: 'תעד את הארוחה האחרונה ונראה איפה עמדת ביעדים היום.'
    },
    {
      title: 'עוד ארוחה להיום? 🍲',
      body: 'אל תשכח לתעד את הארוחה של הערב!'
    }
  ];

  let variants = [...morningVariants, ...afternoonVariants, ...eveningVariants];

  if (timeOfDay === 'morning') {
    variants = morningVariants;
  } else if (timeOfDay === 'afternoon') {
    variants = afternoonVariants;
  } else if (timeOfDay === 'evening') {
    variants = eveningVariants;
  }

  const variant = variants[Math.floor(Math.random() * variants.length)];

  return {
    ...variant,
    route: '/nutrition',
    icon: '/icons/meal.png'
  };
}

/**
 * Get notification template by type
 * Convenience function for unified access to all templates
 */
export function getNotificationTemplate(
  type: string,
  context: TemplateContext = {}
): NotificationData {
  switch (type) {
    case 'daily_protein_reminder':
      return getDailyProteinTargetNotification(context);

    case 'midday_protein_reminder':
      return getMiddayProteinNotification(context);

    case 'weigh_in_reminders':
      return getWeighInReminderNotification();

    case 'stage_completion_alerts':
      return getStageCompletionNotification(context);

    case 'journey_nudges':
      return getJourneyNudgeNotification(context);

    case 'streak_celebrations':
      return getStreakCelebrationNotification(context);

    case 'inactivity_nudges':
      return getInactivityNotification(context);

    case 'meal_reminders':
      return getMealReminderNotification();

    default:
      console.warn(`[Templates] Unknown notification type: ${type}`);
      return {
        title: 'FitJourney',
        body: 'יש לך עדכון חדש במסע שלך',
        route: '/'
      };
  }
}
