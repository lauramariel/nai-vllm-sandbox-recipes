// Shared style primitives so the browse, detail, and submit pages read as
// one system rather than three separately-styled pages. Kept as plain
// class-name strings (not wrapper components) because SubmitForm spreads
// react-hook-form's `register()` directly onto native input/select/
// textarea elements, which needs the real DOM element, not a wrapper.

export const inputClass =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 dark:border-gray-700 dark:bg-gray-900 dark:placeholder:text-gray-500";

export const labelClass = "mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300";

export const buttonPrimaryClass =
  "inline-flex items-center justify-center rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand/90 focus:outline-none focus:ring-2 focus:ring-brand/50 disabled:cursor-not-allowed disabled:opacity-50";

export const buttonSecondaryClass =
  "inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm transition-colors cursor-pointer hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800";

export const cardClass =
  "rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900/40";

export const sectionHeadingClass = "text-base font-semibold tracking-tight";

export const mutedTextClass = "text-sm text-gray-500 dark:text-gray-400";
