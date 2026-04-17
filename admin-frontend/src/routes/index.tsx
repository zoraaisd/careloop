import { Route, Routes } from 'react-router-dom';

const AppRouter = () => {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
            <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
              <h1 className="text-xl font-semibold text-slate-900">
                {import.meta.env.VITE_APP_NAME}
              </h1>
              <p className="mt-2 text-sm text-slate-600">
                Frontend scaffold is ready for feature development.
              </p>
            </div>
          </main>
        }
      />
    </Routes>
  );
};

export { AppRouter };
