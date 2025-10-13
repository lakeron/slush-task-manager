import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Slush Task Manager',
  description: 'A simple task management app connected to Notion',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const databaseUrl = process.env.NOTION_DATABASE_ID
    ? `https://www.notion.so/${process.env.NOTION_DATABASE_ID}`
    : undefined;
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen bg-gray-50">
          <header className="bg-white shadow-sm border-b">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between h-16">
                <div className="flex items-center">
                  <h1 className="text-xl font-semibold text-gray-900">
                    Slush Task Manager
                  </h1>
                </div>
                <div className="flex items-center space-x-4">
                  {databaseUrl ? (
                    <a
                      href={databaseUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hidden sm:inline text-sm text-gray-600 hover:text-gray-700"
                      aria-label="Open Notion database"
                    >
                      Connected to Notion
                    </a>
                  ) : (
                    <span className="hidden sm:inline text-sm text-gray-600">Connected to Notion</span>
                  )}
                  {databaseUrl ? (
                    <a
                      href={databaseUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="sm:hidden w-2 h-2 bg-green-400 rounded-full"
                      aria-label="Open Notion database"
                    />
                  ) : (
                    <div className="sm:hidden w-2 h-2 bg-green-400 rounded-full" />
                  )}
                  <div className="hidden sm:block w-2 h-2 bg-green-400 rounded-full"></div>
                </div>
              </div>
            </div>
          </header>
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}