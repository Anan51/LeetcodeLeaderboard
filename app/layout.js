import "./globals.css";

export const metadata = {
  title: "LeetCode Friends Leaderboard",
  description: "Track and compare your LeetCode progress with your friends.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
