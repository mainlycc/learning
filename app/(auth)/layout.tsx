export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="w-full max-w-md space-y-8 p-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            AIRSET
          </h1>
          <p className="text-lg text-gray-700 dark:text-gray-300">
            Ochrona Lotnictwa Cywilnego
          </p>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Zaloguj się, aby kontynuować
          </p>
        </div>
        {children}
      </div>
    </div>
  )
}
