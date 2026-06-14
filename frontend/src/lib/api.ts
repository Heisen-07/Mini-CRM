const API_URL =
  (process.env.NEXT_PUBLIC_API_URL ||
    (process.env.NODE_ENV === "development" ? "http://localhost:3001" : ""))
  .replace(/\/+$/, "");

console.log("API_URL =", API_URL);

export default API_URL;
