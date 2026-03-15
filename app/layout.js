import "./globals.css";

export const metadata = {
  title: "Trade Discipline Board",
  description: "Capture trade ideas, move them into execution, and close them with discipline.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
