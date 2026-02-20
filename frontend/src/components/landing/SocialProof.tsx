const brands = ["Northwind", "CloudHarbor", "BrightCrate", "ApexLane", "Riverline", "BloomCart"];

export const SocialProof = () => {
  return (
    <section className="px-6 pb-8">
      <div className="mx-auto max-w-6xl rounded-2xl border bg-card p-6">
        <p className="text-center text-sm font-medium text-muted-foreground">
          Trusted by 500+ businesses worldwide
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {brands.map((brand) => (
            <div
              key={brand}
              className="rounded-lg border bg-muted/40 px-3 py-2 text-center text-sm font-semibold text-muted-foreground"
            >
              {brand}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
