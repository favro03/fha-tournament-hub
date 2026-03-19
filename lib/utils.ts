import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import qs from 'query-string'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

//Convert prisma object into a regular JS object
export function convertToPlainObject<T>(value: T): T {
  return JSON.parse(JSON.stringify(value))
}

// Form the pagination links
export function formUrlQuery({
  params,
  key,
  value,
}: {
  params: string;
  key: string;
  value: string | null;
}) {
  const query = qs.parse(params);

  query[key] = value;

  return qs.stringifyUrl(
    {
      url: window.location.pathname,
      query,
    },
    {
      skipNull: true,
    }
  );
}

//Format errors
//eslint-disable-next-line @typescript-eslint/no-explicit-any
export function formatError( error: any) {
  if(error.name === 'ZodError'){
    //Handle ZOD error
    const fieldErrors = error.issues?.map((issue: { message: string }) => issue.message) || [];

    return fieldErrors.join('. ')

  } else if (error.name === 'PrismaClientKnownRequestError' && error.code === 'P2002') {
    //Handle Prisma error
    const field = error.meta?.target ? error.meta.target[0] : 'Field';

    return `${field.charAt(0).toUpperCase() + field.slice(1)} already exists.`;
  } else {
    //Handle other errors
    return typeof error.message === 'string' ? error.message: JSON.stringify(error.message);
  }
}

// --- Bracket date range helpers ---
// Your bracket.date is stored like: "2026-02-06 to 2026-02-08"
// or possibly just: "2026-02-06"

export function parseDateRange(dateStr?: string | null) {
  const raw = (dateStr ?? "").trim();
  if (!raw) return { startDate: "", endDate: "" };

  const parts = raw.split(" to ").map((s) => s.trim());
  return {
    startDate: parts[0] ?? "",
    endDate: parts[1] ?? "",
  };
}

/** If endDate missing, treat startDate as endDate (1-day tournament) */
export function getEndDateFromRange(dateStr?: string | null) {
  const { startDate, endDate } = parseDateRange(dateStr);
  return (endDate || startDate || "").trim();
}