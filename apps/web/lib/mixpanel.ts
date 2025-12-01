import mixpanel from "mixpanel-browser";

const MIXPANEL_TOKEN = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN;

const isEnabled =
  typeof window !== "undefined" &&
  !!MIXPANEL_TOKEN &&
  process.env.NODE_ENV !== "test";

if (isEnabled) {
  mixpanel.init(MIXPANEL_TOKEN as string, {
    debug: process.env.NODE_ENV !== "production",
    track_pageview: false,
  });
}

export function track(event: string, props?: Record<string, any>) {
  if (!isEnabled) return;
  mixpanel.track(event, props);
}

export function identify(userId: string) {
  if (!isEnabled) return;
  mixpanel.identify(userId);
}

export function setUserProps(props: Record<string, any>) {
  if (!isEnabled) return;
  mixpanel.people.set(props);
}
