const DashboardPage = () => {
  return (
    <div className="h-screen w-screen overflow-hidden bg-[#f0f4f3]">
      <iframe
        className="h-full w-full border-none"
        src="/legacy/index.html"
        title="Legacy Doctor Dashboard"
      />
    </div>
  );
};

export { DashboardPage };
