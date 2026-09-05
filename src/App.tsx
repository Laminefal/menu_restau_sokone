function App() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-800">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <header className="mb-10 rounded-2xl bg-gradient-to-r from-emerald-700 to-emerald-500 p-8 text-white shadow-lg">
          <p className="mb-3 text-sm uppercase tracking-[0.2em] text-emerald-100">Menu Sokone</p>
          <h1 className="text-3xl font-bold sm:text-5xl">Découvrez les meilleurs restaurants de Sokone</h1>
          <p className="mt-4 max-w-2xl text-base text-emerald-50 sm:text-lg">
            Consultez les restaurants actifs, découvrez leur menu du jour et trouvez le bon repas à proximité.
          </p>
        </header>

        <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {[
            { name: 'Restaurant Samba', status: 'Ouvert', price: 'Fromage + riz', tag: 'Aujourd’hui' },
            { name: 'Le Petit Délice', status: 'Ouvert', price: 'Thieboudienne', tag: 'Menu du jour' },
            { name: 'Nour Chez Ali', status: 'Fermé', price: 'Poisson grillé', tag: 'Bientôt' },
          ].map((restaurant) => (
            <article key={restaurant.name} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md">
              <div className="h-44 bg-gradient-to-br from-amber-200 via-orange-200 to-rose-200" />
              <div className="p-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h2 className="text-xl font-semibold text-slate-900">{restaurant.name}</h2>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      restaurant.status === 'Ouvert'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {restaurant.status}
                  </span>
                </div>

                <p className="mb-4 text-sm text-slate-600">
                  {restaurant.tag} · Plat phare : {restaurant.price}
                </p>

                <button className="inline-flex items-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-700">
                  Voir le restaurant
                </button>
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}

export default App;
