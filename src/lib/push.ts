// OneSignal Web Push integration
// App ID is a public identifier — safe in client code.
export const ONESIGNAL_APP_ID = "542ed395-1166-44c3-ad7d-fb3a4a2957c5";

declare global {
  interface Window {
    OneSignal?: any;
    OneSignalDeferred?: any[];
  }
}

let initPromise: Promise<void> | null = null;

function isPreviewOrIframe(): boolean {
  if (typeof window === "undefined") return true;
  try {
    if (window.self !== window.top) return true;
  } catch {
    return true;
  }
  const h = window.location.hostname;
  return h.includes("id-preview--") || h.includes("lovableproject.com") || h === "localhost";
}

export function initPush(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (isPreviewOrIframe()) return Promise.resolve(); // evita SW quebrando o preview
  if (initPromise) return initPromise;

  initPromise = new Promise<void>((resolve) => {
    const script = document.createElement("script");
    script.src = "https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js";
    script.defer = true;
    document.head.appendChild(script);

    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async (OneSignal: any) => {
      await OneSignal.init({
        appId: ONESIGNAL_APP_ID,
        allowLocalhostAsSecureOrigin: true,
        notifyButton: { enable: false },
      });
      resolve();
    });
  });
  return initPromise;
}

export async function requestPushPermission(): Promise<"granted" | "denied" | "unsupported"> {
  if (isPreviewOrIframe()) return "unsupported";
  await initPush();
  return new Promise((resolve) => {
    window.OneSignalDeferred?.push(async (OneSignal: any) => {
      try {
        await OneSignal.Notifications.requestPermission();
        resolve(OneSignal.Notifications.permission ? "granted" : "denied");
      } catch {
        resolve("denied");
      }
    });
  });
}

export async function setPushUserId(userId: string | null) {
  if (isPreviewOrIframe()) return;
  await initPush();
  window.OneSignalDeferred?.push(async (OneSignal: any) => {
    try {
      if (userId) await OneSignal.login(userId);
      else await OneSignal.logout();
    } catch {}
  });
}

export function isPushSupported(): boolean {
  return !isPreviewOrIframe();
}
