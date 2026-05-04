import "./globals.css";

export const metadata = {
  title: "AI Page Summarizer",
  description: "Summarize webpages with AI using Next.js"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
