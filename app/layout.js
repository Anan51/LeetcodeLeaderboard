import "./globals.css";

export const metadata = {
  title: "LeetCode Friends Leaderboard",
  description: "Track LeetCode progress and a daily NeetCode streak with your friends.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
