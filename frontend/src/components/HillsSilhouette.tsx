export const HillsSilhouette = () => (
  <div className="absolute bottom-0 left-0 right-0 overflow-hidden pointer-events-none" style={{ height: "180px" }}>
    <svg
      viewBox="0 0 1440 180"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="absolute bottom-0 w-full"
      preserveAspectRatio="none"
    >
      <path
        d="M0 180V120C120 100 240 60 360 70C480 80 600 140 720 130C840 120 960 40 1080 30C1200 20 1320 80 1380 110L1440 140V180H0Z"
        fill="hsl(119, 22%, 45%)"
        fillOpacity="0.12"
      />
      <path
        d="M0 180V140C160 120 320 80 480 90C640 100 800 160 960 150C1120 140 1280 60 1360 30L1440 0V180H0Z"
        fill="hsl(119, 22%, 45%)"
        fillOpacity="0.08"
      />
    </svg>
  </div>
);
