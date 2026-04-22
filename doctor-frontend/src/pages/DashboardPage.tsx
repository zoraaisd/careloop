const DashboardPage = () => {
  return (
    <div className="min-h-dvh w-full overflow-hidden bg-[#f0f4f3]">
      <iframe
        className="min-h-dvh w-full border-none"
        src="/legacy/index.html"
        title="Legacy Doctor Dashboard"
      />
    </div>
  );
};

export { DashboardPage };
