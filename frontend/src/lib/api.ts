export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  (process.env.NODE_ENV === "development"
    ? "http://localhost:3001"
    : "");

if (process.env.NODE_ENV === "development") {
  console.log("API_URL =", API_URL);
}
