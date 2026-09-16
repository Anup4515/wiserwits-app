export type FaqCategory =
  | "Account"
  | "Courses & content"
  | "Payments & subscription"
  | "Certificates"
  | "Technical";

export type Faq = {
  id: string;
  category: FaqCategory;
  question: string;
  answer: string;
};

export const FAQ_CATEGORIES: FaqCategory[] = [
  "Account",
  "Courses & content",
  "Payments & subscription",
  "Certificates",
  "Technical",
];

export const FAQS: Faq[] = [
  {
    id: "acc-reset-password",
    category: "Account",
    question: "How do I reset my password?",
    answer:
      "Open Account & Security from Explore, tap Change password, and follow the steps. If you're signed out, use \"Forgot password\" on the sign-in screen.",
  },
  {
    id: "acc-change-email",
    category: "Account",
    question: "How do I change the email on my account?",
    answer:
      "Email changes are handled by your school admin. Contact support with your student ID and the new address and we'll route the request.",
  },
  {
    id: "acc-multiple-accounts",
    category: "Account",
    question: "Can I use more than one account on the same device?",
    answer:
      "Yes. Open the account switcher from your profile and tap \"Add account\" to sign a second learner in. You can switch between them any time without signing out.",
  },
  {
    id: "acc-delete-account",
    category: "Account",
    question: "How do I delete my account?",
    answer:
      "Email support@wiserwits.com from the address on the account and we'll process the deletion within 7 days. You'll get a confirmation once it's done.",
  },

  {
    id: "course-enrol",
    category: "Courses & content",
    question: "How do I enrol in a course?",
    answer:
      "Open the Courses tab, tap a course, then Enrol. Free courses start immediately; paid courses ask you to pick a plan first.",
  },
  {
    id: "course-offline",
    category: "Courses & content",
    question: "Can I watch course videos offline?",
    answer:
      "Downloaded lessons and PDFs are available offline for 30 days. Look for the download icon on a lesson. Streaming lessons require a connection.",
  },
  {
    id: "course-progress",
    category: "Courses & content",
    question: "Why is my course progress not saving?",
    answer:
      "Progress syncs when you're online. If a lesson doesn't update, pull-to-refresh on the course page. If it persists, contact support with the course name.",
  },
  {
    id: "course-live-missed",
    category: "Courses & content",
    question: "I missed a live class — can I still watch it?",
    answer:
      "Recordings appear under Live classes within 24 hours of the session. If you don't see one, the instructor may have chosen not to publish it.",
  },

  {
    id: "pay-plans",
    category: "Payments & subscription",
    question: "What's included in each plan?",
    answer:
      "Open Plans & Subscription for a full breakdown. Free covers browsing and previews; paid plans unlock full courses, downloads, and certificates.",
  },
  {
    id: "pay-restore",
    category: "Payments & subscription",
    question: "I paid but my plan didn't update. What now?",
    answer:
      "Open Plans & Subscription and tap \"Restore purchases\". If that doesn't help within a few minutes, contact support with your order ID.",
  },
  {
    id: "pay-refund",
    category: "Payments & subscription",
    question: "Can I get a refund?",
    answer:
      "Refunds within 7 days of purchase are handled by the store (App Store or Play Store) — follow their refund process. For anything else, email support.",
  },
  {
    id: "pay-cancel",
    category: "Payments & subscription",
    question: "How do I cancel my subscription?",
    answer:
      "Manage the subscription from the store you bought it in — App Store subscriptions on iOS, Play Store subscriptions on Android. Cancelling stops the next renewal; you keep access until the current period ends.",
  },

  {
    id: "cert-earn",
    category: "Certificates",
    question: "How do I earn a certificate?",
    answer:
      "Complete every lesson and pass the final assessment (usually 60%+). The certificate appears under Certificates once the course reports as 100% complete.",
  },
  {
    id: "cert-download",
    category: "Certificates",
    question: "How do I download or share my certificate?",
    answer:
      "Open Certificates, tap the one you want, then use Download to save the PDF or Share to send it to LinkedIn, WhatsApp, or email.",
  },
  {
    id: "cert-wrong-name",
    category: "Certificates",
    question: "My certificate has the wrong name on it.",
    answer:
      "Update your name in Profile → Edit profile, then contact support to have the certificate reissued. Please include the course name.",
  },

  {
    id: "tech-crash",
    category: "Technical",
    question: "The app keeps crashing or freezing.",
    answer:
      "Force-close and reopen the app. If that doesn't help, update to the latest version and restart your phone. Still stuck? Send us a bug report — include your device model.",
  },
  {
    id: "tech-video",
    category: "Technical",
    question: "Videos won't play or keep buffering.",
    answer:
      "Try switching between Wi-Fi and mobile data. On slower connections, lower the quality from the video player's settings. If it's only one video, let us know which.",
  },
  {
    id: "tech-notifications",
    category: "Technical",
    question: "I'm not getting notifications.",
    answer:
      "Check your phone's settings → Notifications → WiserWits and make sure they're enabled. Also confirm Do Not Disturb / Focus is off. In-app reminders will still work either way.",
  },
  {
    id: "tech-login-loop",
    category: "Technical",
    question: "The app keeps signing me out.",
    answer:
      "This usually means your session expired or the device time is wrong. Check your phone's date & time is set to automatic, then sign in again.",
  },
];
